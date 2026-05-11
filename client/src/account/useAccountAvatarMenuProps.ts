import { useAccountAvatarSettings } from './useAccountAvatarSettings';

interface AccountAvatarMenuAuth {
  user?: {
    id?: string | null;
  } | null;
}

export const useAccountAvatarMenuProps = (auth: AccountAvatarMenuAuth) => {
  const accountUserKey = auth.user?.id || undefined;
  const {
    settings: accountAvatarSettings,
    effectiveBackdropColor,
  } = useAccountAvatarSettings(accountUserKey);

  return {
    avatarLetter: accountAvatarSettings.displayLetter,
    avatarThumbnailUrl: accountAvatarSettings.thumbnailUrl,
    avatarBackdropColor: effectiveBackdropColor,
  };
};
