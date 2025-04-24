export const API_PREFIX = process.env.NODE_ENV === 'production'
  ? 'https://qsservices.uc.r.appspot.com/api/v1'
  : 'http://localhost:6060/api/v1';
