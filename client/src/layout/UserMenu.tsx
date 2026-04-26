import React, { useState, useRef, useEffect } from 'react';
import './UserMenu.css';

interface UserMenuProps {
  email?: string | null;
  onLogout: () => void;
  onProjects?: () => void;
  onSettings?: () => void;
  avatarLetter?: string | null;
  avatarThumbnailUrl?: string | null;
  avatarBackdropColor?: string | null;
}

const UserMenu: React.FC<UserMenuProps> = ({
  email,
  onLogout,
  onProjects,
  onSettings,
  avatarLetter,
  avatarThumbnailUrl,
  avatarBackdropColor,
}) => {
  const [open, setOpen] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const configuredLetter = (avatarLetter || '').trim().charAt(0).toUpperCase();
  const initial = configuredLetter || (email || '?').trim().charAt(0).toUpperCase() || '?';
  const label = email || 'Account';
  const normalizedAvatarThumbnailUrl = (avatarThumbnailUrl || '').trim();
  const showAvatarImage = normalizedAvatarThumbnailUrl && !hasImageError;

  useEffect(() => {
    setHasImageError(false);
  }, [normalizedAvatarThumbnailUrl]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleProjects = () => {
    setOpen(false);
    if (onProjects) onProjects();
  };

  const handleAccountSettings = () => {
    setOpen(false);
    if (onSettings) onSettings();
  };

  return (
    <div className="qs-user-menu" ref={containerRef}>
      <button
        type="button"
        className="qs-user-menu__button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span
          className="qs-user-menu__avatar"
          style={avatarBackdropColor ? { backgroundColor: avatarBackdropColor } : undefined}
        >
          {showAvatarImage ? (
            <img
              src={normalizedAvatarThumbnailUrl}
              alt=""
              className="qs-user-menu__avatar-image"
              onError={() => setHasImageError(true)}
            />
          ) : (
            initial
          )}
        </span>
        <span className="qs-user-menu__caret">▼</span>
      </button>
      {open && (
        <div className="qs-user-menu__dropdown" role="menu">
          <div className="qs-user-menu__email" title={label}>
            {label}
          </div>
          {onProjects && (
            <button
              type="button"
              className="qs-user-menu__item"
              onClick={handleProjects}
              role="menuitem"
            >
              My Projects
            </button>
          )}
          {onSettings && (
            <button
              type="button"
              className="qs-user-menu__item"
              onClick={handleAccountSettings}
              role="menuitem"
            >
              Settings
            </button>
          )}
          <button
            type="button"
            className="qs-user-menu__item"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
