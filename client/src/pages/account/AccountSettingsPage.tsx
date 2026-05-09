import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/authSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAccountAvatarSettings } from '../../account/useAccountAvatarSettings';
import {
  getEffectiveAvatarBackdropColor,
  normalizeBackdropColor,
} from '../../account/accountAvatarSettings';
import './accountSettings.css';

const AccountSettingsPage: React.FC = () => {
  useDocumentTitle('Account Settings - QSurvey System');
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userKey = auth.user?.id || auth.user?.email || null;
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

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

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
  const previewLetter = displayLetter.trim().charAt(0).toUpperCase() || (auth.user?.email || '?').charAt(0).toUpperCase();
  const showPreviewImage = normalizedThumbnailUrl.length > 0 && !hasPreviewImageError;
  const avatarPreview = showPreviewImage ? (
    <img
      src={normalizedThumbnailUrl}
      alt=""
      className="account-settings-avatar-preview-image"
      onError={() => setHasPreviewImageError(true)}
    />
  ) : (
    <span>{previewLetter}</span>
  );
  const pickerBackdropColor = normalizeBackdropColor(backdropColor) || effectiveBackdropColor;
  const defaultBackdropColor = getEffectiveAvatarBackdropColor(settings, userKey);

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
                onChange={(event) => setDisplayLetter(event.target.value.slice(0, 1).toUpperCase())}
                maxLength={1}
                placeholder={(auth.user?.email || '?').charAt(0).toUpperCase()}
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
                  placeholder={defaultBackdropColor}
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

export default AccountSettingsPage;
