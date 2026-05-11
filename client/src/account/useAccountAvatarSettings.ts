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

const createEmptyAvatarSettings = (): AccountAvatarSettings => ({
  displayLetter: '',
  thumbnailUrl: '',
  backdropColor: '',
});

export const useAccountAvatarSettings = (userKey?: string | null) => {
  const stableUserKey = useMemo(() => (userKey === undefined ? undefined : userKey || null), [userKey]);
  const stableStorageKey = useMemo(() => (
    stableUserKey === undefined ? null : getAccountAvatarStorageKey(stableUserKey)
  ), [stableUserKey]);
  const [settings, setSettings] = useState<AccountAvatarSettings>(() => (
    stableUserKey === undefined ? createEmptyAvatarSettings() : loadAccountAvatarSettings(stableUserKey)
  ));
  const disabledSettings = useMemo(createEmptyAvatarSettings, []);

  useEffect(() => {
    if (stableUserKey === undefined) {
      setSettings(createEmptyAvatarSettings());
      return;
    }
    setSettings(loadAccountAvatarSettings(stableUserKey));
  }, [stableUserKey]);

  useEffect(() => {
    if (stableUserKey === undefined || stableStorageKey === null) return undefined;
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
    if (stableUserKey === undefined) return createEmptyAvatarSettings();
    const normalized = saveAccountAvatarSettings(stableUserKey, nextSettings);
    setSettings(normalized);
    return normalized;
  };

  const visibleSettings = stableUserKey === undefined ? disabledSettings : settings;

  return {
    settings: visibleSettings,
    saveSettings,
    effectiveBackdropColor: getEffectiveAvatarBackdropColor(visibleSettings, stableUserKey),
  };
};
