import { getAuthUserFromJwt, normalizeAuthUser } from './authUser';
import { makeTestJwt as makeJwt } from '../testUtils/authToken';

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
