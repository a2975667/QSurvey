import { decodeJwtPayload, getJwtUserKey, isJwtExpired } from './jwt';

const base64UrlEncode = (value: unknown) => (
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
);

const makeJwt = (payload: Record<string, unknown>) => (
  `${base64UrlEncode({ alg: 'none', typ: 'JWT' })}.${base64UrlEncode(payload)}.signature`
);

describe('jwt helpers', () => {
  it('decodes valid JWT payloads', () => {
    const token = makeJwt({ sub: 'user-1', email: 'user@example.com' });

    expect(decodeJwtPayload(token)).toEqual({
      sub: 'user-1',
      email: 'user@example.com',
    });
  });

  it('fails closed for malformed or expired tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(isJwtExpired('not-a-jwt')).toBe(true);
    expect(isJwtExpired(makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 }))).toBe(true);
    expect(isJwtExpired(makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 }))).toBe(false);
  });

  it('extracts a stable user key from common token claims', () => {
    expect(getJwtUserKey(makeJwt({ id: 'id-1', sub: 'sub-1' }))).toBe('id-1');
    expect(getJwtUserKey(makeJwt({ _id: 'mongo-1', sub: 'sub-1' }))).toBe('mongo-1');
    expect(getJwtUserKey(makeJwt({ userId: 'user-id-1', sub: 'sub-1' }))).toBe('user-id-1');
    expect(getJwtUserKey(makeJwt({ sub: 'sub-1', email: 'user@example.com' }))).toBe('sub-1');
    expect(getJwtUserKey(makeJwt({ email: 'user@example.com' }))).toBe('user@example.com');
    expect(getJwtUserKey(makeJwt({ sub: '   ' }))).toBeNull();
  });
});
