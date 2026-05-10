const decodeBase64UrlUtf8 = (value: string): string | null => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  if (typeof atob !== 'function') return null;

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  let encoded = '';
  for (let index = 0; index < bytes.length; index += 1) {
    encoded += `%${bytes[index].toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(encoded);
};

export const decodeJwtPayload = (token: string | null): Record<string, unknown> | null => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const decoded = decodeBase64UrlUtf8(parts[1]);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (_) {
    return null;
  }
};

export const isJwtExpired = (token: string | null): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  return payload.exp <= Math.floor(Date.now() / 1000);
};
