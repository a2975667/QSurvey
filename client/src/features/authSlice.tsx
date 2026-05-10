import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isJwtExpired } from '../lib/jwt';
import { AuthUser, getAuthUserFromJwt, normalizeAuthUser } from './authUser';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: string | null;
    email: string | null;
    roles: string[] | null;
  };
  loading: boolean;
  error: string | null;
}

const emptyUser = (): AuthState['user'] => ({
  id: null,
  email: null,
  roles: null,
});

const toAuthStateUser = (user: AuthUser): AuthState['user'] => ({
  id: user.id,
  email: user.email,
  roles: user.roles,
});

const clearStoredAuth = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_user');
  } catch (_) {}
};

const persistToken = (token: string | null) => {
  if (typeof localStorage === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  } catch (_) {}
};

const persistUser = (user: AuthUser) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('jwt_user', JSON.stringify(toAuthStateUser(user)));
  } catch (_) {}
};

const storedTokenRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('jwt_token') : null;
const hasValidStoredToken = !!storedTokenRaw && !isJwtExpired(storedTokenRaw);
const tokenUser = hasValidStoredToken ? getAuthUserFromJwt(storedTokenRaw) : null;
const initialAuthUser = tokenUser;

if (storedTokenRaw && (!hasValidStoredToken || !tokenUser)) {
  clearStoredAuth();
} else if (initialAuthUser) {
  persistUser(initialAuthUser);
}

const initialState: AuthState = {
  isAuthenticated: !!initialAuthUser,
  token: initialAuthUser ? storedTokenRaw : null,
  user: initialAuthUser ? toAuthStateUser(initialAuthUser) : emptyUser(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ token: string | null; user?: any }>) => {
      const providedUser = normalizeAuthUser(action.payload.user);
      const existingUser = action.payload.token ? normalizeAuthUser(state.user) : null;
      const tokenUser = action.payload.token ? getAuthUserFromJwt(action.payload.token) : null;
      const nextUser = tokenUser || providedUser || existingUser;

      if (!nextUser) {
        state.isAuthenticated = false;
        state.token = null;
        state.user = emptyUser();
        state.loading = false;
        state.error = null;
        clearStoredAuth();
        return;
      }

      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = toAuthStateUser(nextUser);
      persistToken(action.payload.token);
      persistUser(nextUser);
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = emptyUser();
      state.loading = false;
      state.error = action.payload;
      clearStoredAuth();
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = emptyUser();
      clearStoredAuth();
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;

export default authSlice;
