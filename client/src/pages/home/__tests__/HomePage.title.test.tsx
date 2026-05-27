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

  it('renders demo survey choices and navigates to each survey', () => {
    render(
      <Provider store={store}>
        <HomePage />
      </Provider>
    );

    expect(screen.getByText('Prioritize a roadmap')).toBeInTheDocument();
    expect(screen.getByText('Choose a meeting place')).toBeInTheDocument();
    expect(screen.getByText('Allocate a shared budget')).toBeInTheDocument();

    const demoButtons = screen.getAllByRole('button', { name: /try demo/i });
    fireEvent.click(demoButtons[0]);
    fireEvent.click(demoButtons[1]);
    fireEvent.click(demoButtons[2]);

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/survey/6a023b1ada049d7ebee72017');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/survey/680f38261354f9f2000e5db8');
    expect(mockNavigate).toHaveBeenNthCalledWith(3, '/survey/69764360249947669eb93cf8');
  });
});
