import { PassThrough } from 'stream';
import { once } from 'events';
import { ZipWriter } from './zip-writer';

const collectZipBuffer = async (writer: ZipWriter, stream: PassThrough) => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });
  await writer.finalize();
  await once(stream, 'finish');
  return Buffer.concat(chunks);
};

const countSignature = (buffer: Buffer, signature: Buffer) => {
  let count = 0;
  let index = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const next = buffer.indexOf(signature, index);
    if (next === -1) {
      break;
    }
    count += 1;
    index = next + signature.length;
  }
  return count;
};

describe('ZipWriter', () => {
  it('writes multiple entries and a central directory', async () => {
    const stream = new PassThrough();
    const writer = new ZipWriter(stream);

    const entryA = await writer.startFile('a.json');
    await entryA.write('{"a":1}');
    await entryA.end();

    const entryB = await writer.startFile('b.json');
    await entryB.write('{"b":2}');
    await entryB.end();

    const buffer = await collectZipBuffer(writer, stream);

    const localSig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const centralSig = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    const endSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

    expect(countSignature(buffer, localSig)).toBe(2);
    expect(countSignature(buffer, centralSig)).toBe(2);
    expect(buffer.indexOf(endSig)).toBeGreaterThanOrEqual(0);
    expect(buffer.indexOf(Buffer.from('a.json'))).toBeGreaterThanOrEqual(0);
    expect(buffer.indexOf(Buffer.from('b.json'))).toBeGreaterThanOrEqual(0);
  });
});
