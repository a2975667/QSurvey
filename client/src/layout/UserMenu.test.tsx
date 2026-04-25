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
