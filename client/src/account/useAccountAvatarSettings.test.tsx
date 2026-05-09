import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { saveAccountAvatarSettings } from './accountAvatarSettings';
import { useAccountAvatarSettings } from './useAccountAvatarSettings';

const AvatarSettingsProbe: React.FC<{ userKey?: string | null }> = ({ userKey }) => {
  const { settings, effectiveBackdropColor } = useAccountAvatarSettings(userKey);

  return (
    <div>
      <span data-testid="display-letter">{settings.displayLetter || '-'}</span>
      <span data-testid="backdrop-color">{effectiveBackdropColor}</span>
    </div>
  );
};

describe('useAccountAvatarSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('only applies avatar update events for the matching normalized storage key', async () => {
    saveAccountAvatarSettings('User@Example.com', {
      displayLetter: 'A',
      thumbnailUrl: '',
      backdropColor: '#A6C29B',
    });

    render(<AvatarSettingsProbe userKey=" user@example.com " />);

    expect(screen.getByTestId('display-letter')).toHaveTextContent('A');

    act(() => {
      saveAccountAvatarSettings('other@example.com', {
        displayLetter: 'B',
        thumbnailUrl: '',
        backdropColor: '#EBC57C',
      });
    });

    expect(screen.getByTestId('display-letter')).toHaveTextContent('A');

    act(() => {
      saveAccountAvatarSettings('user@example.com', {
        displayLetter: 'C',
        thumbnailUrl: '',
        backdropColor: '#6E799C',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('display-letter')).toHaveTextContent('C');
    });
  });

  it('keeps anonymous settings isolated from signed-in user updates', () => {
    render(<AvatarSettingsProbe userKey={null} />);

    act(() => {
      saveAccountAvatarSettings('user@example.com', {
        displayLetter: 'U',
        thumbnailUrl: '',
        backdropColor: '#A6C2CE',
      });
    });

    expect(screen.getByTestId('display-letter')).toHaveTextContent('-');

    act(() => {
      saveAccountAvatarSettings(null, {
        displayLetter: 'G',
        thumbnailUrl: '',
        backdropColor: '#9C8F96',
      });
    });

    expect(screen.getByTestId('display-letter')).toHaveTextContent('G');
    expect(screen.getByTestId('backdrop-color')).toHaveTextContent('#9C8F96');
  });
});
