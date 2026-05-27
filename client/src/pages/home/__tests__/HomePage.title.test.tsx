import { fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import HomePage from '../HomePage';
import authSlice from '../../../features/authSlice';

const mockNavigate = jest.fn();
const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
  });

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

describe('HomePage', () => {
  beforeEach(() => {
    document.title = 'Default Title';
    mockNavigate.mockClear();
  });

  it('sets SEO title and renders quadratic voting search-intent copy', () => {
    render(
      <Provider store={createTestStore()}>
        <HomePage />
      </Provider>
    );

    expect(document.title).toBe('QSurvey | Quadratic Voting Survey Tool');
    expect(screen.getByRole('heading', { name: 'Try Quadratic Survey' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create your own Quadratic Survey' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Begin Survey' })).toBeInTheDocument();
    expect(screen.queryByText(/QSurvey: Quadratic Voting Surveys/i)).not.toBeInTheDocument();
  });

  it('renders demo survey choices and navigates to each survey', () => {
    render(
      <Provider store={createTestStore()}>
        <HomePage />
      </Provider>
    );

    expect(screen.getByText('Prioritize a roadmap')).toBeInTheDocument();
    expect(screen.getByText('Choose a meeting place')).toBeInTheDocument();
    expect(screen.getByText('Allocate a shared budget')).toBeInTheDocument();

    const tryHeading = screen.getByRole('heading', { name: 'Try Quadratic Survey' });
    const beginHeading = screen.getByRole('heading', { name: 'Begin Survey' });
    expect(
      tryHeading.compareDocumentPosition(beginHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Try Quadratic Survey: Prioritize a roadmap/i }));
    fireEvent.click(screen.getByRole('button', { name: /Try Quadratic Survey: Choose a meeting place/i }));
    fireEvent.click(screen.getByRole('button', { name: /Try Quadratic Survey: Allocate a shared budget/i }));

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/survey/6a023b1ada049d7ebee72017');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/survey/680f38261354f9f2000e5db8');
    expect(mockNavigate).toHaveBeenNthCalledWith(3, '/survey/69764360249947669eb93cf8');
  });
});
