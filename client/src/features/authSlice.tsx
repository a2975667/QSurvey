import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('jwt_token'),
  token: localStorage.getItem('jwt_token'),
  user: {
    id: null,
    email: null,
    roles: null,
  },
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
    loginSuccess: (state, action: PayloadAction<{ token: string; user?: any }>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      localStorage.setItem('jwt_token', action.payload.token);
      
      if (action.payload.user) {
        state.user = {
          id: action.payload.user.id || action.payload.user._id,
          email: action.payload.user.email,
          roles: action.payload.user.roles,
        };
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
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;

export default authSlice;