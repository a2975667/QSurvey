import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import App from './App';
import store from './app/store';

describe('App auth bootstrap', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    jest.clearAllMocks();
  });

  it('calls /auth/me once when the app mounts', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: { email: 'test@example.com', roles: [], id: 'user-1' } }),
      } as any);

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({
        credentials: 'include',
      }));
    });
  });
});
