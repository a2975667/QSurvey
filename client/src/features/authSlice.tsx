import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isJwtExpired } from '../lib/jwt';

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

const storedTokenRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('jwt_token') : null;
const hasValidStoredToken = !!storedTokenRaw && !isJwtExpired(storedTokenRaw);

if (typeof localStorage !== 'undefined' && storedTokenRaw && !hasValidStoredToken) {
  try {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_user');
  } catch (_) {}
}

// Safely parse stored user from localStorage
const storedUserRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('jwt_user') : null;
let storedUser: { id: string | null; email: string | null; roles: string[] | null } = {
  id: null,
  email: null,
  roles: null,
};
try {
  if (storedUserRaw) {
    const parsed = JSON.parse(storedUserRaw);
    storedUser = {
      id: parsed?.id ?? parsed?._id ?? null,
      email: parsed?.email ?? null,
      roles: parsed?.roles ?? null,
    };
  }
} catch (_) {
  // if parsing fails, clear the corrupted value
  try { localStorage.removeItem('jwt_user'); } catch (_) {}
}

const initialState: AuthState = {
  isAuthenticated: hasValidStoredToken,
  token: hasValidStoredToken ? storedTokenRaw : null,
  user: storedUser,
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
      state.isAuthenticated = true;
      state.token = action.payload.token;
      if (action.payload.token) {
        localStorage.setItem('jwt_token', action.payload.token);
      } else {
        localStorage.removeItem('jwt_token');
      }
      
      if (action.payload.user) {
        state.user = {
          id: action.payload.user.id || action.payload.user._id,
          email: action.payload.user.email,
          roles: action.payload.user.roles,
        };
        try {
          localStorage.setItem('jwt_user', JSON.stringify(state.user));
        } catch (_) {}
      }
      
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = {
        id: null,
        email: null,
        roles: null,
      };
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = {
        id: null,
        email: null,
        roles: null,
      };
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('jwt_user');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;

export default authSlice;
