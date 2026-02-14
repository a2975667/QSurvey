import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

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

import App from './App';
import store from './app/store';

test('renders home page banner', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  expect(screen.getByText('QSurvey System')).toBeInTheDocument();
});
