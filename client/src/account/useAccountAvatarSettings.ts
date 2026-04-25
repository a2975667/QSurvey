import { useEffect, useMemo, useState } from 'react';
import {
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
    const handleSettingsUpdate = () => {
      setSettings(loadAccountAvatarSettings(stableUserKey));
    };
    window.addEventListener('qsurvey-account-avatar-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('qsurvey-account-avatar-settings-updated', handleSettingsUpdate);
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
