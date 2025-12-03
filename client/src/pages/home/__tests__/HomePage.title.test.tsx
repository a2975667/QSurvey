import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import HomePage from '../HomePage';
import store from '../../../app/store';

// Mock react-router-dom to bypass ESM resolution in Jest
jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      useNavigate: () => jest.fn(),
      useParams: () => ({}),
    };
  },
  { virtual: true },
);

describe('HomePage document title', () => {
  beforeEach(() => {
    document.title = 'Default Title';
  });

  it('should set document title to "QSurvey System"', () => {
    render(
      <Provider store={store}>
        <HomePage />
      </Provider>
    );

    expect(document.title).toBe('QSurvey System');
  });
});
