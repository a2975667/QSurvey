import { API_PREFIX } from '../config';
import store from '../app/store';
import { loginSuccess, logout } from '../features/authSlice';

type FetchArgs = Parameters<typeof fetch>;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  // Always include credentials so httpOnly cookies are sent
  const headers = new Headers(init.headers || {});
  const doFetch = (reqInit: RequestInit) =>
    fetch(input, { ...reqInit, headers, credentials: 'include' });

  let res = await doFetch(init);
  if (res.status !== 401) return res;

  // Attempt token refresh
  const refreshRes = await fetch(`${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!refreshRes.ok) {
    // refresh failed; log out
    store.dispatch(logout());
    return res; // return original 401
  }

  const data = await refreshRes.json();
  if (data && data.user) {
    // Authenticate client state; token remains managed by httpOnly cookie
    store.dispatch(loginSuccess({ token: null, user: data.user }));
    // retry original request with cookies
    res = await doFetch(init);
  }
  return res;
}

export async function apiJson<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}
