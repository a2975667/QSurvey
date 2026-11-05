const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

// Run in a child process: a regression in GHSA-27r3-jxmh-p828 must fail the
// test without crashing the test runner. All requests stay on loopback.
test('compressed request parsing survives trailing bytes and keeps serving', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const http = require('node:http');
    const zlib = require('node:zlib');
    const decoders = [];
    for (const name of ['createGunzip', 'createInflate', 'createBrotliDecompress']) {
      const create = zlib[name];
      Object.defineProperty(zlib, name, { value: (...args) => {
        const stream = create(...args);
        decoders.push(stream);
        return stream;
      } });
    }
    const express = require('express');
    const app = express();
    // Match the parsers registered in src/main.ts.
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.post('/echo', (req, res) => res.json(req.body));
    app.get('/health', (req, res) => res.send('ok'));
    app.use((err, req, res, next) => res.sendStatus(err.status || 500));

    const server = app.listen(0, '127.0.0.1', async () => {
      function send(path, body, type, encoding, trailing) {
        return new Promise((resolve, reject) => {
          const headers = body ? {
            'content-type': type,
            'content-encoding': encoding,
            'content-length': body.length + (trailing ? trailing.length : 0),
          } : {};
          const req = http.request({
            host: '127.0.0.1', port: server.address().port, path,
            method: body ? 'POST' : 'GET', headers,
          }, res => {
            let text = '';
            res.on('data', chunk => { text += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, text }));
          });
          req.on('error', reject);
          if (trailing) {
            req.write(body);
            // Let the valid frame finish parsing before the trailing bytes arrive.
            setTimeout(() => req.end(trailing), 50);
          } else {
            req.end(body);
          }
        });
      }
      try {
        for (const [type, text] of [
          ['application/json', '{"value":"ok"}'],
          ['application/x-www-form-urlencoded', 'value=ok'],
        ]) {
          for (const [encoding, compress] of [
            ['gzip', zlib.gzipSync], ['deflate', zlib.deflateSync],
            ['br', zlib.brotliCompressSync],
          ]) {
            const compressed = compress(Buffer.from(text));
            const valid = await send('/echo', compressed, type, encoding);
            assert.equal(valid.status, 200);
            assert.deepEqual(JSON.parse(valid.text), { value: 'ok' });
            // Deterministically exercise a decoder error after parsing completed,
            // the unhandled-error condition behind GHSA-27r3-jxmh-p828.
            decoders.at(-1).emit('error', new Error('late decompression error'));
            const malformed = await send('/echo', compressed, type, encoding,
              Buffer.from('trailing garbage'));
            // Decoders may reject the extra bytes or complete the valid frame.
            assert.ok([200, 400].includes(malformed.status));
            await new Promise(resolve => setTimeout(resolve, 50));
            const health = await send('/health');
            assert.equal(health.status, 200);
            assert.equal(health.text, 'ok');
          }
        }
        server.close();
      } catch (err) {
        console.error(err);
        server.close();
        process.exitCode = 1;
      }
    });
  `], { cwd: require('node:path').join(__dirname, '..'), encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
