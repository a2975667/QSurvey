import { decodeJwtPayload, isJwtExpired } from './jwt';

const base64UrlEncode = (value: unknown) => {
  const encoded = encodeURIComponent(JSON.stringify(value));
  let binary = '';
  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] === '%') {
      binary += String.fromCharCode(parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      binary += encoded[index];
    }
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const makeJwt = (payload: unknown) => (
  `${base64UrlEncode({ alg: 'none', typ: 'JWT' })}.${base64UrlEncode(payload)}.signature`
);

describe('jwt helpers', () => {
  it('decodes valid JWT payloads', () => {
    const token = makeJwt({ user_id: 'user-1', user_email: 'user@example.com' });

    expect(decodeJwtPayload(token)).toEqual({
      user_id: 'user-1',
      user_email: 'user@example.com',
    });
  });

  it('decodes JWT payloads as UTF-8 JSON', () => {
    const token = makeJwt({ user_id: 'user-1', user_email: 'renée@example.com' });

    expect(decodeJwtPayload(token)).toEqual({
      user_id: 'user-1',
      user_email: 'renée@example.com',
    });
  });

  it('rejects decoded payloads that are not JSON objects', () => {
    expect(decodeJwtPayload(makeJwt(null))).toBeNull();
    expect(decodeJwtPayload(makeJwt(['user-1']))).toBeNull();
    expect(decodeJwtPayload(makeJwt('user-1'))).toBeNull();
    expect(decodeJwtPayload(makeJwt(42))).toBeNull();
    expect(decodeJwtPayload(makeJwt(true))).toBeNull();
  });

  it('fails closed for malformed or expired tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(isJwtExpired('not-a-jwt')).toBe(true);
    expect(isJwtExpired(makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 }))).toBe(true);
    expect(isJwtExpired(makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 }))).toBe(false);
  });
});
