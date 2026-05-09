import { getJwtUserKey } from '../lib/jwt';

interface AccountUserKeyAuth {
  token?: string | null;
  user?: {
    id?: string | null;
    _id?: string | null;
    email?: string | null;
  } | null;
}

export const getAccountUserKey = (auth: AccountUserKeyAuth): string | null => {
  const candidates = [
    auth.user?.id,
    auth.user?._id,
    auth.user?.email,
    getJwtUserKey(auth.token || null),
  ];

  const userKey = candidates.find((candidate) => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return userKey || null;
};
