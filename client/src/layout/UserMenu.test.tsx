import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UserMenu from './UserMenu';

describe('UserMenu', () => {
  it('uses the configured avatar letter before the email initial', () => {
    render(
      <UserMenu
        email="alpha@example.com"
        avatarLetter="q"
        onLogout={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('Q');
  });

  it('uses shared letter normalization for non-BMP initials', () => {
    render(
      <UserMenu
        email="😀user@example.com"
        onLogout={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('😀');
  });

  it('applies the configured avatar backdrop color', () => {
    render(
      <UserMenu
        email="alpha@example.com"
        avatarLetter="q"
        avatarBackdropColor="#A6C29B"
        onLogout={jest.fn()}
      />,
    );

    expect(screen.getByText('Q')).toHaveStyle({ backgroundColor: '#A6C29B' });
  });

  it('falls back to the configured letter when the thumbnail fails to load', () => {
    const { container } = render(
      <UserMenu
        email="alpha@example.com"
        avatarLetter="q"
        avatarThumbnailUrl="https://example.com/missing.png"
        onLogout={jest.fn()}
      />,
    );

    const avatarImage = container.querySelector('.qs-user-menu__avatar-image');
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute('referrerpolicy', 'no-referrer');

    fireEvent.error(avatarImage as Element);

    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('Q');
  });

  it('does not render unsafe avatar thumbnail URL schemes', () => {
    const { container } = render(
      <UserMenu
        email="alpha@example.com"
        avatarLetter="q"
        avatarThumbnailUrl="data:image/svg+xml,<svg></svg>"
        onLogout={jest.fn()}
      />,
    );

    expect(container.querySelector('.qs-user-menu__avatar-image')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('Q');
  });

  it('shows settings when provided and invokes the settings handler', () => {
    const onSettings = jest.fn();

    render(
      <UserMenu
        email="alpha@example.com"
        onLogout={jest.fn()}
        onSettings={onSettings}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));

    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
