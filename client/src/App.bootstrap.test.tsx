import { render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

// Mock react-router-dom for Jest to avoid ESM resolver issues
jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Route: ({ element }: { element?: React.ReactElement }) => element ?? null,
      Navigate: () => null,
      useSearchParams: () => [new URLSearchParams(), jest.fn()],
      useNavigate: () => jest.fn(),
      useParams: () => ({}),
      Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
  },
  { virtual: true },
);

// Stub react-vega to avoid ESM dependencies in tests
jest.mock(
  'react-vega',
  () => ({
    VegaLite: () => null,
  }),
  { virtual: true },
);

// Stub heavy survey components to avoid pulling in d3/vega during App import
jest.mock('./pages/survey/components', () => {
  const React = require('react');
  return {
    QuadraticSurveyPage: () => React.createElement('div', null, 'QV Stub'),
    SurveyCompletePage: () => React.createElement('div', null, 'Complete Stub'),
  };
});

// Stub designer results page to avoid importing visualization dependencies
jest.mock('./pages/designer/SurveyResultsPage', () => {
  const React = require('react');
  return () => React.createElement('div', null, 'Results Stub');
});

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

  it('renders without issuing auth bootstrap call', async () => {
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
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });
  });
});
