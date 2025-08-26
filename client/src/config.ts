export const API_PREFIX = process.env.NODE_ENV === 'production'
  ? 'https://qsurvey.online/api/v1'
  : 'http://localhost:6060/api/v1';
