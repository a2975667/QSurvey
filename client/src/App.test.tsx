import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

const mockLocation = { pathname: '/', search: '?uuid=secret', hash: '#token' };

// Mock react-router-dom to bypass ESM resolution in Jest
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
      useLocation: () => mockLocation,
      useParams: () => ({}),
      Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
  },
  { virtual: true },
);

// Stub react-vega to avoid ESM-only dependencies during Jest
jest.mock(
  'react-vega',
  () => ({
    VegaLite: () => null,
  }),
  { virtual: true },
);

// Stub heavy survey components to avoid importing visualization dependencies
jest.mock('./pages/survey/components', () => {
  const React = require('react');
  return {
    QuadraticSurveyPage: () => React.createElement('div', null, 'QV Stub'),
    SurveyCompletePage: () => React.createElement('div', null, 'Complete Stub'),
  };
});

// Stub designer results page to avoid ESM deps
jest.mock('./pages/designer/SurveyResultsPage', () => {
  const React = require('react');
  return () => React.createElement('div', null, 'Results Stub');
});

// Stub About page to avoid duplicate AppShell rendering under Route mock
jest.mock('./pages/about', () => {
  const React = require('react');
  return () => React.createElement('div', null, 'About Stub');
});

jest.mock('./analytics/googleAnalytics', () => ({
  getAnalyticsConsent: jest.fn(),
  initAnalytics: jest.fn(),
  setAnalyticsConsent: jest.fn(),
  shouldRequestAnalyticsConsent: jest.fn(),
  trackPageView: jest.fn(),
}));

import App from './App';
import store from './app/store';
import {
  getAnalyticsConsent,
  initAnalytics,
  setAnalyticsConsent,
  shouldRequestAnalyticsConsent,
  trackPageView,
} from './analytics/googleAnalytics';

const mockGetAnalyticsConsent = getAnalyticsConsent as jest.Mock;
const mockInitAnalytics = initAnalytics as jest.Mock;
const mockSetAnalyticsConsent = setAnalyticsConsent as jest.Mock;
const mockShouldRequestAnalyticsConsent = shouldRequestAnalyticsConsent as jest.Mock;
const mockTrackPageView = trackPageView as jest.Mock;

beforeEach(() => {
  mockGetAnalyticsConsent.mockReturnValue(null);
  mockInitAnalytics.mockReturnValue(true);
  mockShouldRequestAnalyticsConsent.mockReturnValue(false);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders home page banner', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  expect(screen.getByText('QSurvey System')).toBeInTheDocument();
});

test('tracks route page views through analytics helper', () => {
  mockGetAnalyticsConsent.mockReturnValue('accepted');

  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );

  expect(mockInitAnalytics).toHaveBeenCalledWith(undefined, undefined, 'accepted');
  expect(mockTrackPageView).toHaveBeenCalledWith(mockLocation, undefined, 'accepted');
});

test('tracks route page views before analytics consent with denied storage mode', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );

  expect(mockInitAnalytics).toHaveBeenCalledWith(undefined, undefined, null);
  expect(mockTrackPageView).toHaveBeenCalledWith(mockLocation, undefined, null);
});

test('shows analytics consent notice and stores accepted consent', () => {
  mockShouldRequestAnalyticsConsent.mockReturnValue(true);

  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );

  expect(screen.getByRole('region', { name: /analytics consent/i })).toHaveTextContent(
    /without analytics cookie storage/i,
  );

  fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));

  expect(mockSetAnalyticsConsent).toHaveBeenCalledWith('accepted');
});
