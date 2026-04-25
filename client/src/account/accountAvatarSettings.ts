export interface AccountAvatarSettings {
  displayLetter: string;
  thumbnailUrl: string;
}

const STORAGE_PREFIX = 'qsurvey.accountAvatarSettings.v1';

const emptySettings: AccountAvatarSettings = {
  displayLetter: '',
  thumbnailUrl: '',
};

export const getAccountAvatarStorageKey = (userKey?: string | null): string => {
  const normalizedUserKey = (userKey || 'anonymous').trim().toLowerCase() || 'anonymous';
  return `${STORAGE_PREFIX}:${normalizedUserKey}`;
};

export const normalizeAvatarLetter = (value: string): string => {
  return Array.from(value.trim()).slice(0, 1).join('').toUpperCase();
};

export const normalizeThumbnailUrl = (value: string): string => {
  return value.trim();
};

export const loadAccountAvatarSettings = (userKey?: string | null): AccountAvatarSettings => {
  if (typeof localStorage === 'undefined') return emptySettings;

  try {
    const raw = localStorage.getItem(getAccountAvatarStorageKey(userKey));
    if (!raw) return emptySettings;
    const parsed = JSON.parse(raw);
    return {
      displayLetter: normalizeAvatarLetter(parsed?.displayLetter || ''),
      thumbnailUrl: normalizeThumbnailUrl(parsed?.thumbnailUrl || ''),
    };
  } catch (_) {
    return emptySettings;
  }
};

export const saveAccountAvatarSettings = (
  userKey: string | null | undefined,
  settings: AccountAvatarSettings,
): AccountAvatarSettings => {
  const normalized = {
    displayLetter: normalizeAvatarLetter(settings.displayLetter),
    thumbnailUrl: normalizeThumbnailUrl(settings.thumbnailUrl),
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(getAccountAvatarStorageKey(userKey), JSON.stringify(normalized));
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qsurvey-account-avatar-settings-updated', {
      detail: { userKey },
    }));
  }

  return normalized;
};

