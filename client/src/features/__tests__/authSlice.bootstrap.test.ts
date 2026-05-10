const toBase64Url = (value: unknown): string => {
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
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  const body = toBase64Url(payload);
  return `${header}.${body}.signature`;
};

describe('authSlice bootstrap token validation', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('uses token claims as the source of truth when local token is unexpired', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'user-1',
      user_email: 'token@example.com',
      user_roles: ['Designer'],
    });
    localStorage.setItem('jwt_token', token);
    localStorage.setItem(
      'jwt_user',
      JSON.stringify({ id: 'user-1', email: 'user@example.com', roles: ['Designer'] }),
    );

    let state: any;
    jest.isolateModules(() => {
      const authSlice = require('../authSlice').default;
      state = authSlice.reducer(undefined, { type: '@@INIT' });
    });

    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(token);
    expect(state.user).toEqual({
      id: 'user-1',
      email: 'token@example.com',
      roles: ['Designer'],
    });
    expect(JSON.parse(localStorage.getItem('jwt_user') || '{}')).toEqual(state.user);
  });

  it('overwrites tampered stored user identity with valid token claims on bootstrap', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'token-user-1',
      user_email: 'token@example.com',
      user_roles: ['Designer'],
    });
    localStorage.setItem('jwt_token', token);
    localStorage.setItem(
      'jwt_user',
      JSON.stringify({ id: 'tampered-user-1', email: 'tampered@example.com', roles: ['Admin'] }),
    );

    let state: any;
    jest.isolateModules(() => {
      const authSlice = require('../authSlice').default;
      state = authSlice.reducer(undefined, { type: '@@INIT' });
    });

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({
      id: 'token-user-1',
      email: 'token@example.com',
      roles: ['Designer'],
    });
    expect(JSON.parse(localStorage.getItem('jwt_user') || '{}')).toEqual(state.user);
  });

  it('hydrates canonical user from valid token claims when stored user is missing', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'token-user-1',
      user_email: 'token@example.com',
      user_roles: ['Designer'],
    });
    localStorage.setItem('jwt_token', token);

    let state: any;
    jest.isolateModules(() => {
      const authSlice = require('../authSlice').default;
      state = authSlice.reducer(undefined, { type: '@@INIT' });
    });

    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(token);
    expect(state.user).toEqual({
      id: 'token-user-1',
      email: 'token@example.com',
      roles: ['Designer'],
    });
    expect(JSON.parse(localStorage.getItem('jwt_user') || '{}')).toEqual(state.user);
  });

  it('clears stale storage and boots unauthenticated when local token is expired', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) - 60,
      user_id: 'user-1',
      user_email: 'user@example.com',
      user_roles: ['Designer'],
    });
    localStorage.setItem('jwt_token', token);
    localStorage.setItem(
      'jwt_user',
      JSON.stringify({ id: 'user-1', email: 'user@example.com', roles: ['Designer'] }),
    );

    let state: any;
    jest.isolateModules(() => {
      const authSlice = require('../authSlice').default;
      state = authSlice.reducer(undefined, { type: '@@INIT' });
    });

    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('jwt_user')).toBeNull();
  });

  it('clears valid tokens that do not carry required auth identity claims', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_email: 'user@example.com',
      user_roles: ['Designer'],
    });
    localStorage.setItem('jwt_token', token);
    localStorage.setItem(
      'jwt_user',
      JSON.stringify({ id: 'stored-user-1', email: 'stored@example.com', roles: ['Designer'] }),
    );

    let state: any;
    jest.isolateModules(() => {
      const authSlice = require('../authSlice').default;
      state = authSlice.reducer(undefined, { type: '@@INIT' });
    });

    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user.id).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('jwt_user')).toBeNull();
  });

  it('uses token claims when loginSuccess refreshes only the token', () => {
    const nextToken = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'user-1',
      user_email: 'token@example.com',
      user_roles: ['Designer'],
    });

    let authSlice: any;
    jest.isolateModules(() => {
      authSlice = require('../authSlice');
    });

    let state = authSlice.default.reducer(undefined, authSlice.loginSuccess({
      token: 'initial-token',
      user: { id: 'user-1', email: 'stored@example.com', roles: ['Designer'] },
    }));

    state = authSlice.default.reducer(state, authSlice.loginSuccess({ token: nextToken }));

    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(nextToken);
    expect(state.user).toEqual({
      id: 'user-1',
      email: 'token@example.com',
      roles: ['Designer'],
    });
  });

  it('uses new token identity instead of mismatched existing user on refresh', () => {
    const nextToken = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'token-user-2',
      user_email: 'token-two@example.com',
      user_roles: ['Designer'],
    });

    let authSlice: any;
    jest.isolateModules(() => {
      authSlice = require('../authSlice');
    });

    let state = authSlice.default.reducer(undefined, authSlice.loginSuccess({
      token: 'initial-token',
      user: { id: 'user-1', email: 'stored@example.com', roles: ['Admin'] },
    }));

    state = authSlice.default.reducer(state, authSlice.loginSuccess({ token: nextToken }));

    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(nextToken);
    expect(state.user).toEqual({
      id: 'token-user-2',
      email: 'token-two@example.com',
      roles: ['Designer'],
    });
  });

  it('uses token identity instead of mismatched provided user', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'token-user-1',
      user_email: 'token@example.com',
      user_roles: ['Designer'],
    });

    let authSlice: any;
    jest.isolateModules(() => {
      authSlice = require('../authSlice');
    });

    const state = authSlice.default.reducer(undefined, authSlice.loginSuccess({
      token,
      user: { id: 'provided-user-1', email: 'provided@example.com', roles: ['Admin'] },
    }));

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({
      id: 'token-user-1',
      email: 'token@example.com',
      roles: ['Designer'],
    });
  });

  it('derives canonical user when loginSuccess receives only a valid token', () => {
    const token = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_id: 'token-user-1',
      user_email: 'token@example.com',
      user_roles: ['Designer'],
    });

    let authSlice: any;
    jest.isolateModules(() => {
      authSlice = require('../authSlice');
    });

    const state = authSlice.default.reducer(undefined, authSlice.loginSuccess({ token }));

    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(token);
    expect(state.user).toEqual({
      id: 'token-user-1',
      email: 'token@example.com',
      roles: ['Designer'],
    });
  });

  it('clears auth when loginSuccess receives neither token nor user', () => {
    let authSlice: any;
    jest.isolateModules(() => {
      authSlice = require('../authSlice');
    });

    let state = authSlice.default.reducer(undefined, authSlice.loginSuccess({
      token: 'initial-token',
      user: { id: 'user-1', email: 'stored@example.com', roles: ['Designer'] },
    }));

    state = authSlice.default.reducer(state, authSlice.loginSuccess({ token: null }));

    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user.id).toBeNull();
  });
});
