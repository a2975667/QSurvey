export interface AccountAvatarSettings {
  displayLetter: string;
  thumbnailUrl: string;
  backdropColor: string;
}

export interface AccountAvatarSettingsUpdatedDetail {
  userKey?: string | null;
  settings: AccountAvatarSettings;
}

const STORAGE_PREFIX = 'qsurvey.accountAvatarSettings.v1';
export const ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT = 'qsurvey-account-avatar-settings-updated';
const FALLBACK_BACKDROP_COLOR = '#6E799C';

const emptySettings: AccountAvatarSettings = {
  displayLetter: '',
  thumbnailUrl: '',
  backdropColor: '',
};

const createEmptySettings = (): AccountAvatarSettings => ({ ...emptySettings });

const normalizeAccountAvatarUserKey = (userKey?: string | null): string => {
  return (userKey || 'anonymous').trim().toLowerCase() || 'anonymous';
};

export const getAccountAvatarStorageKey = (userKey?: string | null): string => {
  return `${STORAGE_PREFIX}:${normalizeAccountAvatarUserKey(userKey)}`;
};

export const normalizeAvatarLetter = (value: string): string => {
  return Array.from(value.trim().toUpperCase()).slice(0, 1).join('');
};

export const normalizeThumbnailUrl = (value: string): string => {
  return value.trim();
};

export const getAvatarColorFromHash = (value?: string | null): string => {
  const colors = ['#6E799C', '#A6C2CE', '#A6C29B', '#EBC57C', '#9C8F96'];
  const seed = (value || '').trim().toLowerCase();
  if (!seed) return FALLBACK_BACKDROP_COLOR;

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }

  return colors[Math.abs(hash) % colors.length];
};

export const normalizeBackdropColor = (value: string): string => {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : '';
};

export const getEffectiveAvatarBackdropColor = (
  settings: Pick<AccountAvatarSettings, 'backdropColor'>,
  userKey?: string | null,
): string => {
  return normalizeBackdropColor(settings.backdropColor) || getAvatarColorFromHash(userKey);
};

export const loadAccountAvatarSettings = (userKey?: string | null): AccountAvatarSettings => {
  if (typeof localStorage === 'undefined') return createEmptySettings();

  try {
    const raw = localStorage.getItem(getAccountAvatarStorageKey(userKey));
    if (!raw) return createEmptySettings();
    const parsed = JSON.parse(raw);
    return {
      displayLetter: normalizeAvatarLetter(parsed?.displayLetter || ''),
      thumbnailUrl: normalizeThumbnailUrl(parsed?.thumbnailUrl || ''),
      backdropColor: normalizeBackdropColor(parsed?.backdropColor || ''),
    };
  } catch (_) {
    return createEmptySettings();
  }
};

export const saveAccountAvatarSettings = (
  userKey: string | null | undefined,
  settings: AccountAvatarSettings,
): AccountAvatarSettings => {
  const normalized = {
    displayLetter: normalizeAvatarLetter(settings.displayLetter),
    thumbnailUrl: normalizeThumbnailUrl(settings.thumbnailUrl),
    backdropColor: normalizeBackdropColor(settings.backdropColor),
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getAccountAvatarStorageKey(userKey), JSON.stringify(normalized));
    } catch (_) {
      // Keep the in-memory UI path working when browser storage is unavailable.
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AccountAvatarSettingsUpdatedDetail>(ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT, {
      detail: {
        userKey,
        settings: normalized,
      },
    }));
  }

  return normalized;
};
