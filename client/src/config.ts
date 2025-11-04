// Prefer env override, then same-origin in production, localhost in dev
export const API_PREFIX =
  (process.env as any).REACT_APP_API_PREFIX ||
  (process.env.NODE_ENV === 'production'
    ? '/api/v1'
    : 'http://localhost:6060/api/v1');
