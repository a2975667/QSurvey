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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const configuredLetter = (avatarLetter || '').trim().charAt(0).toUpperCase();
  const initial = configuredLetter || (email || '?').trim().charAt(0).toUpperCase() || '?';
  const label = email || 'Account';

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

  const handleSettings = () => {
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
          {avatarThumbnailUrl ? (
            <img src={avatarThumbnailUrl} alt="" className="qs-user-menu__avatar-image" />
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
              onClick={handleSettings}
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
