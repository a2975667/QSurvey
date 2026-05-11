import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getAccountAvatarStorageKey, saveAccountAvatarSettings } from './accountAvatarSettings';
import { useAccountAvatarSettings } from './useAccountAvatarSettings';

const AvatarSettingsProbe: React.FC<{ userKey?: string | null }> = ({ userKey }) => {
  const { settings, saveSettings, effectiveBackdropColor } = useAccountAvatarSettings(userKey);

  return (
    <div>
      <span data-testid="display-letter">{settings.displayLetter || '-'}</span>
      <span data-testid="backdrop-color">{effectiveBackdropColor}</span>
      <button
        type="button"
        onClick={() => saveSettings({
          displayLetter: 'Z',
          thumbnailUrl: '',
          backdropColor: '#EBC57C',
        })}
      >
        Save avatar
      </button>
    </div>
  );
};

describe('useAccountAvatarSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not load anonymous settings when userKey is undefined', () => {
    saveAccountAvatarSettings(null, {
      displayLetter: 'G',
      thumbnailUrl: '',
      backdropColor: '#9C8F96',
    });

    render(<AvatarSettingsProbe />);

    expect(screen.getByTestId('display-letter')).toHaveTextContent('-');
  });

  it('ignores avatar update events when userKey is undefined', () => {
    render(<AvatarSettingsProbe />);

    act(() => {
      saveAccountAvatarSettings(null, {
        displayLetter: 'G',
        thumbnailUrl: '',
        backdropColor: '#9C8F96',
      });
    });

    expect(screen.getByTestId('display-letter')).toHaveTextContent('-');
  });

  it('does not save avatar settings when userKey is undefined', () => {
    render(<AvatarSettingsProbe />);

    fireEvent.click(screen.getByRole('button', { name: 'Save avatar' }));

    expect(screen.getByTestId('display-letter')).toHaveTextContent('-');
    expect(localStorage.getItem(getAccountAvatarStorageKey(null))).toBeNull();
  });

  it('only applies avatar update events for the matching trimmed storage key', async () => {
    saveAccountAvatarSettings(' UserId-1 ', {
      displayLetter: 'A',
      thumbnailUrl: '',
      backdropColor: '#A6C29B',
    });

    render(<AvatarSettingsProbe userKey="UserId-1" />);

    expect(screen.getByTestId('display-letter')).toHaveTextContent('A');

    act(() => {
      saveAccountAvatarSettings('userid-1', {
        displayLetter: 'B',
        thumbnailUrl: '',
        backdropColor: '#EBC57C',
      });
    });

    expect(screen.getByTestId('display-letter')).toHaveTextContent('A');

    act(() => {
      saveAccountAvatarSettings('UserId-1', {
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
