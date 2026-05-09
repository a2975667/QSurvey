import { useEffect, useMemo, useState } from 'react';
import {
  ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT,
  AccountAvatarSettings,
  AccountAvatarSettingsUpdatedDetail,
  getEffectiveAvatarBackdropColor,
  getAccountAvatarStorageKey,
  loadAccountAvatarSettings,
  saveAccountAvatarSettings,
} from './accountAvatarSettings';

export const useAccountAvatarSettings = (userKey?: string | null) => {
  const stableUserKey = useMemo(() => userKey || null, [userKey]);
  const stableStorageKey = useMemo(() => getAccountAvatarStorageKey(stableUserKey), [stableUserKey]);
  const [settings, setSettings] = useState<AccountAvatarSettings>(() => (
    loadAccountAvatarSettings(stableUserKey)
  ));

  useEffect(() => {
    setSettings(loadAccountAvatarSettings(stableUserKey));
  }, [stableUserKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AccountAvatarSettingsUpdatedDetail>).detail;
      if (!detail) {
        setSettings(loadAccountAvatarSettings(stableUserKey));
        return;
      }
      if (getAccountAvatarStorageKey(detail.userKey) !== stableStorageKey) return;
      setSettings(detail.settings || loadAccountAvatarSettings(stableUserKey));
    };
    window.addEventListener(ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    return () => {
      window.removeEventListener(ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    };
  }, [stableStorageKey, stableUserKey]);

  const saveSettings = (nextSettings: AccountAvatarSettings) => {
    const normalized = saveAccountAvatarSettings(stableUserKey, nextSettings);
    setSettings(normalized);
    return normalized;
  };

  return {
    settings,
    saveSettings,
    effectiveBackdropColor: getEffectiveAvatarBackdropColor(settings, stableUserKey),
  };
};
