import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/authSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAccountAvatarSettings } from '../../account/useAccountAvatarSettings';
import './accountSettings.css';

const AccountSettingsPage: React.FC = () => {
  useDocumentTitle('Account Settings - QSurvey System');
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userKey = auth.user?.id || auth.user?.email || null;
  const { settings, saveSettings } = useAccountAvatarSettings(userKey);
  const [displayLetter, setDisplayLetter] = useState(settings.displayLetter);
  const [thumbnailUrl, setThumbnailUrl] = useState(settings.thumbnailUrl);
  const [savedMessage, setSavedMessage] = useState('');

  React.useEffect(() => {
    setDisplayLetter(settings.displayLetter);
    setThumbnailUrl(settings.thumbnailUrl);
  }, [settings.displayLetter, settings.thumbnailUrl]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const savedSettings = saveSettings({
      displayLetter,
      thumbnailUrl,
    });
    setDisplayLetter(savedSettings.displayLetter);
    setThumbnailUrl(savedSettings.thumbnailUrl);
    setSavedMessage('Account display settings saved.');
  };

  const avatarPreview = thumbnailUrl.trim() ? (
    <img src={thumbnailUrl.trim()} alt="" className="account-settings-avatar-preview-image" />
  ) : (
    <span>{displayLetter.trim().charAt(0).toUpperCase() || (auth.user?.email || '?').charAt(0).toUpperCase()}</span>
  );

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
              <div className="account-settings-avatar-preview" aria-label="Avatar preview">
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

