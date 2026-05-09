import { getAccountUserKey } from './accountUserKey';

const base64UrlEncode = (value: unknown) => (
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
);

const makeJwt = (payload: Record<string, unknown>) => (
  `${base64UrlEncode({ alg: 'none', typ: 'JWT' })}.${base64UrlEncode(payload)}.signature`
);

describe('accountUserKey', () => {
  it('prefers stored user identity over token identity', () => {
    const token = makeJwt({ sub: 'token-user-1', email: 'token@example.com' });

    expect(getAccountUserKey({
      token,
      user: { id: 'stored-user-1', email: 'stored@example.com' },
    })).toBe('stored-user-1');
  });

  it('falls back to email and then token identity', () => {
    expect(getAccountUserKey({
      token: null,
      user: { id: null, email: 'stored@example.com' },
    })).toBe('stored@example.com');

    expect(getAccountUserKey({
      token: makeJwt({ sub: 'token-user-1', email: 'token@example.com' }),
      user: { id: null, email: null },
    })).toBe('token-user-1');
  });

  it('returns null when no stable account identity is available', () => {
    expect(getAccountUserKey({
      token: 'missing.identity.token',
      user: { id: null, email: null },
    })).toBeNull();
  });
});
