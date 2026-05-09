import React, { useState } from 'react';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { RootState } from '../../app/store';
import { logout } from '../../features/authSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAccountAvatarSettings } from '../../account/useAccountAvatarSettings';
import {
  normalizeAvatarLetter,
  normalizeBackdropColor,
} from '../../account/accountAvatarSettings';
import './accountSettings.css';

type AuthState = RootState['auth'];

const decodeJwtPayload = (token: string | null): Record<string, any> | null => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    if (typeof atob !== 'function') return null;
    return JSON.parse(atob(padded));
  } catch (_) {
    return null;
  }
};

const getTokenUserKey = (token: string | null): string | null => {
  const payload = decodeJwtPayload(token);
  const candidates = [
    payload?.id,
    payload?._id,
    payload?.userId,
    payload?.sub,
    payload?.email,
  ];

  const userKey = candidates.find((candidate) => (
    typeof candidate === 'string' && candidate.trim().length > 0
  ));
  return userKey || null;
};

const getAccountUserKey = (auth: AuthState): string | null => {
  return auth.user?.id || auth.user?.email || getTokenUserKey(auth.token);
};

interface AccountSettingsContentProps {
  auth: AuthState;
  userKey: string;
  navigate: NavigateFunction;
  handleLogout: () => void;
}

const AccountSettingsContent: React.FC<AccountSettingsContentProps> = ({
  auth,
  userKey,
  navigate,
  handleLogout,
}) => {
  const { settings, saveSettings, effectiveBackdropColor } = useAccountAvatarSettings(userKey);
  const [displayLetter, setDisplayLetter] = useState(settings.displayLetter);
  const [thumbnailUrl, setThumbnailUrl] = useState(settings.thumbnailUrl);
  const [backdropColor, setBackdropColor] = useState(settings.backdropColor);
  const [hasPreviewImageError, setHasPreviewImageError] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  React.useEffect(() => {
    setDisplayLetter(settings.displayLetter);
    setThumbnailUrl(settings.thumbnailUrl);
    setBackdropColor(settings.backdropColor);
  }, [settings]);

  React.useEffect(() => {
    setHasPreviewImageError(false);
  }, [thumbnailUrl]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const savedSettings = saveSettings({
      displayLetter,
      thumbnailUrl,
      backdropColor,
    });
    setDisplayLetter(savedSettings.displayLetter);
    setThumbnailUrl(savedSettings.thumbnailUrl);
    setBackdropColor(savedSettings.backdropColor);
    setSavedMessage('Account display settings saved.');
  };

  const normalizedThumbnailUrl = thumbnailUrl.trim();
  const fallbackLetter = normalizeAvatarLetter(auth.user?.email || '?') || '?';
  const previewLetter = normalizeAvatarLetter(displayLetter) || fallbackLetter;
  const showPreviewImage = normalizedThumbnailUrl.length > 0 && !hasPreviewImageError;
  const avatarPreview = showPreviewImage ? (
    <img
      src={normalizedThumbnailUrl}
      alt=""
      className="account-settings-avatar-preview-image"
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasPreviewImageError(true)}
    />
  ) : (
    <span>{previewLetter}</span>
  );
  const pickerBackdropColor = normalizeBackdropColor(backdropColor) || effectiveBackdropColor;

  return (
    <AppShell
      appBarProps={{
        title: 'QSurvey System',
        breadcrumbs: [
          { label: 'Projects', onClick: () => navigate('/designer') },
          { label: 'Account Settings' },
        ],
        onTitleClick: () => navigate('/'),
        actions: auth.isAuthenticated ? (
          <UserMenu
            email={auth.user?.email}
            onLogout={handleLogout}
            onProjects={() => navigate('/designer')}
            onSettings={() => navigate('/settings')}
            avatarLetter={settings.displayLetter}
            avatarThumbnailUrl={settings.thumbnailUrl}
            avatarBackdropColor={effectiveBackdropColor}
          />
        ) : undefined,
      }}
    >
      <div className="account-settings-container">
        <section className="account-settings-panel">
          <div className="account-settings-header">
            <h1>Account Settings</h1>
            <p>Configure how your account appears in the top app bar.</p>
          </div>

          <form className="account-settings-form" onSubmit={handleSave}>
            <div className="account-settings-preview-row">
              <div
                className="account-settings-avatar-preview"
                aria-label="Avatar preview"
                style={{ backgroundColor: pickerBackdropColor }}
              >
                {avatarPreview}
              </div>
              <div>
                <div className="account-settings-preview-label">Top bar avatar</div>
                <div className="account-settings-preview-email">{auth.user?.email || 'Account'}</div>
              </div>
            </div>

            <label className="account-settings-field" htmlFor="avatar-letter">
              <span>Display letter</span>
              <input
                id="avatar-letter"
                value={displayLetter}
                onChange={(event) => setDisplayLetter(normalizeAvatarLetter(event.target.value))}
                placeholder={fallbackLetter}
              />
            </label>

            <label className="account-settings-field" htmlFor="backdrop-color">
              <span>Backdrop color</span>
              <div className="account-settings-color-row">
                <input
                  id="backdrop-color"
                  type="color"
                  value={pickerBackdropColor}
                  onChange={(event) => setBackdropColor(event.target.value.toUpperCase())}
                  aria-label="Backdrop color"
                />
                <input
                  value={backdropColor}
                  onChange={(event) => setBackdropColor(event.target.value)}
                  aria-label="Backdrop color hex"
                  placeholder={effectiveBackdropColor}
                />
              </div>
            </label>

            <label className="account-settings-field" htmlFor="thumbnail-url">
              <span>Thumbnail URL</span>
              <input
                id="thumbnail-url"
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </label>

            <div className="account-settings-actions">
              <button type="button" className="account-settings-secondary" onClick={() => navigate('/designer')}>
                Back to Projects
              </button>
              <button type="submit" className="account-settings-primary">
                Save Settings
              </button>
            </div>

            {savedMessage && (
              <p className="account-settings-status" role="status">
                {savedMessage}
              </p>
            )}
          </form>
        </section>
      </div>
    </AppShell>
  );
};

const AccountSettingsPage: React.FC = () => {
  useDocumentTitle('Account Settings - QSurvey System');
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userKey = getAccountUserKey(auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!userKey) {
    return (
      <AppShell
        appBarProps={{
          title: 'QSurvey System',
          breadcrumbs: [
            { label: 'Projects', onClick: () => navigate('/designer') },
            { label: 'Account Settings' },
          ],
          onTitleClick: () => navigate('/'),
          actions: auth.isAuthenticated ? (
            <UserMenu
              email={auth.user?.email}
              onLogout={handleLogout}
              onProjects={() => navigate('/designer')}
              onSettings={() => navigate('/settings')}
            />
          ) : undefined,
        }}
      >
        <div className="account-settings-container">
          <section className="account-settings-panel">
            <div className="account-settings-header">
              <h1>Account Settings</h1>
              <p>Account identity is still loading. Sign out and sign in again to update account display settings.</p>
            </div>
            <div className="account-settings-actions">
              <button type="button" className="account-settings-secondary" onClick={() => navigate('/designer')}>
                Back to Projects
              </button>
              <button type="button" className="account-settings-primary" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AccountSettingsContent
      auth={auth}
      userKey={userKey}
      navigate={navigate}
      handleLogout={handleLogout}
    />
  );
};

export default AccountSettingsPage;
