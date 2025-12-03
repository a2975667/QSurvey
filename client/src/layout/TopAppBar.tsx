import React from 'react';
import './TopAppBar.css';

interface TopAppBarProps {
  title: string;
  subtitle?: string; // legacy; prefer breadcrumbs
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: ReadonlyArray<{ label: string; onClick?: () => void }>;
  onTitleClick?: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  leading,
  actions,
  breadcrumbs,
  onTitleClick,
}) => {
  const TitleTag = onTitleClick ? 'button' : 'div';
  const effectiveBreadcrumbs =
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs
      : subtitle
      ? [{ label: subtitle }]
      : [];

  return (
    <header className="qs-top-app-bar">
      <div className="qs-top-app-bar__row">
        <div className="qs-top-app-bar__section qs-top-app-bar__section--start">
          {leading && <div className="qs-top-app-bar__leading">{leading}</div>}
          <div className="qs-top-app-bar__title-group">
            <TitleTag
              className="qs-top-app-bar__title"
              {...(onTitleClick
                ? {
                    type: 'button',
                    onClick: onTitleClick,
                  }
                : {})}
            >
              <span className="qs-top-app-bar__title-text">{title}</span>
            </TitleTag>
            {effectiveBreadcrumbs.map((crumb, index) => {
              const isLast = index === effectiveBreadcrumbs.length - 1;
              const key = `${crumb.label}-${index}`;
              const isClickable = isLast || typeof crumb.onClick === 'function';
              const CrumbTag = isClickable ? 'button' : 'span';
              const clickHandler =
                typeof crumb.onClick === 'function' ? crumb.onClick : undefined;
              return (
                <React.Fragment key={key}>
                  <span className="qs-top-app-bar__breadcrumb-sep">/</span>
                  <CrumbTag
                    className={
                      isClickable
                        ? 'qs-top-app-bar__breadcrumb qs-top-app-bar__breadcrumb--link'
                        : 'qs-top-app-bar__breadcrumb'
                    }
                    {...(isClickable ? { type: 'button', onClick: clickHandler } : {})}
                    title={crumb.label}
                  >
                    {crumb.label}
                  </CrumbTag>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <div className="qs-top-app-bar__section qs-top-app-bar__section--end">
          {actions}
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;
