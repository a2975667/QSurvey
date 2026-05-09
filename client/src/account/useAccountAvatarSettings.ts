import { useEffect, useMemo, useState } from 'react';
import {
  ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT,
  AccountAvatarSettings,
  getEffectiveAvatarBackdropColor,
  loadAccountAvatarSettings,
  saveAccountAvatarSettings,
} from './accountAvatarSettings';

export const useAccountAvatarSettings = (userKey?: string | null) => {
  const stableUserKey = useMemo(() => userKey || null, [userKey]);
  const [settings, setSettings] = useState<AccountAvatarSettings>(() => (
    loadAccountAvatarSettings(stableUserKey)
  ));

  useEffect(() => {
    setSettings(loadAccountAvatarSettings(stableUserKey));
  }, [stableUserKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleSettingsUpdate = () => {
      setSettings(loadAccountAvatarSettings(stableUserKey));
    };
    window.addEventListener(ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    return () => {
      window.removeEventListener(ACCOUNT_AVATAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    };
  }, [stableUserKey]);

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
