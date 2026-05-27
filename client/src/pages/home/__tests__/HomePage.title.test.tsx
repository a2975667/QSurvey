import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import HomePage from '../HomePage';
import store from '../../../app/store';

const mockNavigate = jest.fn();

// Mock react-router-dom to bypass ESM resolution in Jest
jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      useNavigate: () => mockNavigate,
      useParams: () => ({}),
    };
  },
  { virtual: true },
);

describe('HomePage document title', () => {
  beforeEach(() => {
    document.title = 'Default Title';
    mockNavigate.mockClear();
  });

  it('should set document title to "QSurvey System"', () => {
    render(
      <Provider store={store}>
        <HomePage />
      </Provider>
    );

    expect(document.title).toBe('QSurvey System');
  });

  it('navigates to the website feature demo survey', () => {
    render(
      <Provider store={store}>
        <HomePage />
      </Provider>
    );

    expect(screen.getByText('QSurvey Website Feature Survey')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start demo survey/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/survey/6a023b1ada049d7ebee72017');
  });
});
