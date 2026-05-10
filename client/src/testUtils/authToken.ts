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

export const makeTestJwt = (payload: unknown): string => {
  const header = toBase64Url({ alg: 'none', typ: 'JWT' });
  const body = toBase64Url(payload);
  return `${header}.${body}.signature`;
};

export const makeAuthToken = (claims: Record<string, unknown> = {}): string => (
  makeTestJwt({
    exp: 4102444800,
    user_id: 'user-1',
    user_email: 'user@example.org',
    user_roles: ['designer'],
    ...claims,
  })
);
