import { getAuthUserFromJwt, normalizeAuthUser } from './authUser';

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

describe('auth user helpers', () => {
  it('normalizes current server JWT claims into canonical auth user shape', () => {
    expect(getAuthUserFromJwt(makeJwt({
      user_id: ' user-1 ',
      user_email: ' user@example.com ',
      user_roles: ['Designer', 3, 'Admin'],
    }))).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['Designer', 'Admin'],
    });
  });

  it('rejects JWT claims without the required server user id claim', () => {
    expect(getAuthUserFromJwt(makeJwt({
      sub: 'sub-1',
      email: 'user@example.com',
      user_roles: ['Designer'],
    }))).toBeNull();
    expect(getAuthUserFromJwt(makeJwt({ user_id: '   ' }))).toBeNull();
  });

  it('normalizes raw auth user ingress from id or _id only', () => {
    expect(normalizeAuthUser({
      id: ' user-1 ',
      email: ' user@example.com ',
      roles: ['Designer', null],
    })).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['Designer'],
    });

    expect(normalizeAuthUser({
      _id: 'mongo-user-1',
      email: '',
      roles: null,
    })).toEqual({
      id: 'mongo-user-1',
      email: null,
      roles: [],
    });
  });

  it('does not treat email or unrelated aliases as account identity', () => {
    expect(normalizeAuthUser({ email: 'user@example.com', roles: ['Designer'] })).toBeNull();
    expect(normalizeAuthUser({ userId: 'user-1', email: 'user@example.com' })).toBeNull();
    expect(normalizeAuthUser({ sub: 'user-1', email: 'user@example.com' })).toBeNull();
  });
});
