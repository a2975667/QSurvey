export const decodeJwtPayload = (token: string | null): Record<string, any> | null => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    if (typeof atob !== 'function') return null;
    return JSON.parse(atob(padded));
  } catch (_) {
    return null;
  }
};

export const isJwtExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  return payload.exp <= Math.floor(Date.now() / 1000);
};

export const getJwtUserKey = (token: string | null): string | null => {
  const payload = decodeJwtPayload(token);
  const candidates = [
    payload?.id,
    payload?._id,
    payload?.userId,
    payload?.sub,
    payload?.email,
  ];

  const userKey = candidates.find((candidate) => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return userKey || null;
};
