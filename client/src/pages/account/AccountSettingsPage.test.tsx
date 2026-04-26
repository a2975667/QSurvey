import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import authSlice, { loginSuccess } from '../../features/authSlice';
import AccountSettingsPage from './AccountSettingsPage';
import { getAccountAvatarStorageKey } from '../../account/accountAvatarSettings';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true },
);

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
  });

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  it('saves the avatar letter, backdrop color, and thumbnail URL for the current user', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({
      token: 'token-1',
      user: { id: 'user-1', email: 'alpha@example.com', roles: ['Designer'] },
    }));

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText('Display letter'), { target: { value: 'z' } });
    fireEvent.change(screen.getByLabelText('Backdrop color hex'), { target: { value: '#A6C29B' } });
    fireEvent.change(screen.getByLabelText('Thumbnail URL'), {
      target: { value: 'https://example.com/avatar.png' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Account display settings saved.');
    });

    expect(localStorage.getItem(getAccountAvatarStorageKey('user-1'))).toBe(JSON.stringify({
      displayLetter: 'Z',
      thumbnailUrl: 'https://example.com/avatar.png',
      backdropColor: '#A6C29B',
    }));
  });

  it('keeps the hash-based backdrop default when no color override is entered', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({
      token: 'token-1',
      user: { id: 'user-1', email: 'alpha@example.com', roles: ['Designer'] },
    }));

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    expect(screen.getByLabelText('Backdrop color hex')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Account display settings saved.');
    });

    expect(localStorage.getItem(getAccountAvatarStorageKey('user-1'))).toBe(JSON.stringify({
      displayLetter: '',
      thumbnailUrl: '',
      backdropColor: '',
    }));
  });

  it('navigates back to projects from the secondary action', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({
      token: 'token-1',
      user: { id: 'user-1', email: 'alpha@example.com', roles: ['Designer'] },
    }));

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to Projects' }));

    expect(mockNavigate).toHaveBeenCalledWith('/designer');
  });
});
