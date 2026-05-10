import { decodeJwtPayload } from '../lib/jwt';

export interface AuthUser {
  id: string;
  email: string | null;
  roles: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const normalizeRequiredString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRoles = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((role): role is string => typeof role === 'string');
};

export const normalizeAuthUser = (rawUser: unknown): AuthUser | null => {
  if (!isRecord(rawUser)) return null;

  const id = normalizeRequiredString(rawUser.id) || normalizeRequiredString(rawUser._id);
  if (!id) return null;

  return {
    id,
    email: normalizeOptionalString(rawUser.email),
    roles: normalizeRoles(rawUser.roles),
  };
};

export const getAuthUserFromJwt = (token: string | null): AuthUser | null => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id = normalizeRequiredString(payload.user_id);
  if (!id) return null;

  return {
    id,
    email: normalizeOptionalString(payload.user_email),
    roles: normalizeRoles(payload.user_roles),
  };
};
