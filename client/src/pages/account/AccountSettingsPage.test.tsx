import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import authSlice, { loginSuccess } from '../../features/authSlice';
import AccountSettingsPage from './AccountSettingsPage';
import {
  getAccountAvatarStorageKey,
  getEffectiveAvatarBackdropColor,
} from '../../account/accountAvatarSettings';

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

const base64UrlEncode = (value: unknown) => (
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
);

const makeJwt = (payload: Record<string, unknown>) => (
  `${base64UrlEncode({ alg: 'none', typ: 'JWT' })}.${base64UrlEncode(payload)}.signature`
);

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    expect(screen.getByLabelText('Backdrop color hex')).toHaveAttribute(
      'placeholder',
      getEffectiveAvatarBackdropColor({ backdropColor: '' }, 'user-1'),
    );

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

  it('still reports saved settings when localStorage persistence fails', async () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({
      token: 'token-1',
      user: { id: 'user-1', email: 'alpha@example.com', roles: ['Designer'] },
    }));
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText('Display letter'), { target: { value: 'z' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Account display settings saved.');
    });
    expect(screen.getByLabelText('Display letter')).toHaveValue('Z');
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('Z');
  });

  it('falls back to the display letter when the preview thumbnail fails to load', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({
      token: 'token-1',
      user: { id: 'user-1', email: 'alpha@example.com', roles: ['Designer'] },
    }));

    const { container } = render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText('Display letter'), { target: { value: 'q' } });
    fireEvent.change(screen.getByLabelText('Thumbnail URL'), {
      target: { value: 'https://example.com/missing.png' },
    });

    const previewImage = container.querySelector('.account-settings-avatar-preview-image');
    expect(previewImage).toBeInTheDocument();
    expect(previewImage).toHaveAttribute('referrerpolicy', 'no-referrer');

    fireEvent.error(previewImage as Element);

    expect(screen.getByLabelText('Avatar preview')).toHaveTextContent('Q');
  });

  it('normalizes non-BMP display letters consistently in the form preview', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({
      token: 'token-1',
      user: { id: 'user-1', email: '😀user@example.com', roles: ['Designer'] },
    }));

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    expect(screen.getByLabelText('Display letter')).toHaveAttribute('placeholder', '😀');
    expect(screen.getByLabelText('Avatar preview')).toHaveTextContent('😀');

    fireEvent.change(screen.getByLabelText('Display letter'), { target: { value: '🚀x' } });

    expect(screen.getByLabelText('Display letter')).toHaveValue('🚀');
    expect(screen.getByLabelText('Avatar preview')).toHaveTextContent('🚀');
  });

  it('keeps uppercase-expanded display letters to a single avatar character', () => {
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

    fireEvent.change(screen.getByLabelText('Display letter'), { target: { value: 'ß' } });

    expect(screen.getByLabelText('Display letter')).toHaveValue('S');
    expect(screen.getByLabelText('Avatar preview')).toHaveTextContent('S');
  });

  it('uses token identity for avatar settings when stored user details are missing', async () => {
    const store = createTestStore();
    const token = makeJwt({ sub: 'token-user-1', email: 'token-user@example.com' });
    store.dispatch(loginSuccess({ token }));

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText('Display letter'), { target: { value: 't' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Account display settings saved.');
    });

    expect(localStorage.getItem(getAccountAvatarStorageKey('token-user-1'))).toBe(JSON.stringify({
      displayLetter: 'T',
      thumbnailUrl: '',
      backdropColor: '',
    }));
    expect(localStorage.getItem(getAccountAvatarStorageKey(null))).toBeNull();
  });

  it('does not write shared anonymous avatar settings when authenticated identity is unavailable', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ token: 'missing.identity.token' }));

    render(
      <Provider store={store}>
        <AccountSettingsPage />
      </Provider>,
    );

    expect(screen.queryByRole('button', { name: 'Save Settings' })).not.toBeInTheDocument();
    expect(screen.getByText(/Account identity is still loading/i)).toBeInTheDocument();
    expect(localStorage.getItem(getAccountAvatarStorageKey(null))).toBeNull();
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
