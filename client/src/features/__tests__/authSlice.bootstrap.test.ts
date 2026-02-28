const toBase64Url = (value: unknown): string =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

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

  it('keeps authenticated state when local token is unexpired', () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
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
    expect(state.user.email).toBe('user@example.com');
  });

  it('clears stale storage and boots unauthenticated when local token is expired', () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
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
});
