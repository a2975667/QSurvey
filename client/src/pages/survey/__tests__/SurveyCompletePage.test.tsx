import React from 'react';
import { Provider } from 'react-redux';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';

let mockSurveyId = 'survey-1';
let mockSearchParams = '';
const mockNavigate = jest.fn();
const originalFetch = (global as any).fetch;

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Route: ({ element }: { element?: React.ReactElement }) => element ?? null,
      useParams: () => ({ id: mockSurveyId }),
      useSearchParams: () => [new URLSearchParams(mockSearchParams), jest.fn()],
      useNavigate: () => mockNavigate,
      Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
  },
  { virtual: true },
);

import SurveyCompletePage from '../components/SurveyCompletePage';
import authSlice from '../../../features/authSlice';
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';

jest.mock('../../../hooks/useDocumentTitle', () => ({
  useDocumentTitle: jest.fn(),
}));

jest.mock('../components/SubmittedResultsSection', () => {
  const React = require('react');
  const MockSubmittedResultsSection = (props: any) =>
    React.createElement('div', {
      'data-testid': 'submitted-results-stub',
      'data-uuid': props?.uuid || '',
    });
  return { __esModule: true, default: MockSubmittedResultsSection };
});

const SURVEY_ID = 'survey-1';

const renderPage = ({
  route,
  metadataOverrides,
  questionsOverrides,
  unifiedOverrides,
}: {
  route: string;
  metadataOverrides?: Record<string, any>;
  questionsOverrides?: Record<string, any>;
  unifiedOverrides?: Record<string, any>;
}) => {
  const authState = authSlice.reducer(undefined, { type: '@@INIT' } as any);
  const metadataState = metadataSlice.reducer(undefined, { type: '@@INIT' } as any);
  const questionsState = questionsSlice.reducer(undefined, { type: '@@INIT' } as any);
  const unifiedState = unifiedResponsesReducer(undefined, { type: '@@INIT' } as any);

  const store = configureStore({
    reducer: {
      auth: authSlice.reducer,
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
    },
    preloadedState: {
      auth: authState,
      metadata: {
        ...metadataState,
        loaded: true,
        surveyId: SURVEY_ID,
        ...metadataOverrides,
      },
      questions: {
        ...questionsState,
        loaded: true,
        loadedSurveyId: SURVEY_ID,
        ...questionsOverrides,
      },
      unifiedResponses: {
        ...unifiedState,
        ...unifiedOverrides,
      },
    } as any,
  });

  const [pathPart, queryPart] = route.split('?');
  const routeId = pathPart.split('/')[2];
  mockSurveyId = routeId || SURVEY_ID;
  mockSearchParams = queryPart || '';

  render(
    <Provider store={store}>
      <SurveyCompletePage />
    </Provider>,
  );

  return store;
};

describe('SurveyCompletePage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).fetch = originalFetch;
  });

  it('keeps thank-you view by default and uses query uuid when showing results', () => {
    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid&sKey=query-s&uKey=query-u`,
      metadataOverrides: {
        sKey: 'meta-s',
        uKey: 'meta-u',
        respondentsCanViewResults: true,
      },
      unifiedOverrides: {
        uuid: 'state-uuid',
      },
    });

    expect(screen.queryByTestId('submitted-results-stub')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /see results/i }));

    const stub = screen.getByTestId('submitted-results-stub');
    expect(stub).toHaveAttribute('data-uuid', 'query-uuid');
    expect(stub).not.toHaveAttribute('data-skey');
    expect(stub).not.toHaveAttribute('data-ukey');
  });

  it('does not pass metadata keys into participant completed results', () => {
    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid`,
      metadataOverrides: {
        sKey: 'meta-s',
        uKey: 'meta-u',
        respondentsCanViewResults: true,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /see results/i }));

    const stub = screen.getByTestId('submitted-results-stub');
    expect(stub).toHaveAttribute('data-uuid', 'query-uuid');
    expect(stub).not.toHaveAttribute('data-skey');
    expect(stub).not.toHaveAttribute('data-ukey');
  });

  it('hides the results affordance when participant results are disabled for the survey', () => {
    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid`,
      metadataOverrides: {
        respondentsCanViewResults: false,
      },
      unifiedOverrides: {
        uuid: 'state-uuid',
      },
    });

    expect(screen.queryByRole('button', { name: /see results/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hide results/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/see results/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/submitted results/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('submitted-results-stub')).not.toBeInTheDocument();
  });

  it('does not show the results affordance when participant result visibility is unknown', () => {
    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid`,
      metadataOverrides: {
        respondentsCanViewResults: undefined,
      },
      unifiedOverrides: {
        uuid: 'state-uuid',
      },
    });

    expect(screen.queryByRole('button', { name: /see results/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/see results/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('submitted-results-stub')).not.toBeInTheDocument();
  });

  it('shows the results affordance when participant results are enabled for the survey', () => {
    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid`,
      metadataOverrides: {
        respondentsCanViewResults: true,
      },
    });

    expect(screen.getByRole('button', { name: /see results/i })).toBeInTheDocument();
  });

  it('keeps duplicate-submission behavior and does not expose results toggle', () => {
    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid&sKey=query-s&uKey=query-u`,
      unifiedOverrides: {
        status: 'duplicate',
        error: { code: 'DUPLICATE_SUBMISSION' },
      },
    });

    expect(screen.queryByRole('button', { name: /see results/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /submit new response to the survey/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('submitted-results-stub')).not.toBeInTheDocument();
  });

  it('does not fetch survey questions when complete page loads without question catalog for this survey', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ questions: [] }),
      } as Response);
    (global as any).fetch = fetchMock;

    renderPage({
      route: `/survey/${SURVEY_ID}/complete?uuid=query-uuid`,
      questionsOverrides: {
        loaded: false,
        loadedSurveyId: undefined,
      },
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes(`/surveys/${SURVEY_ID}`))).toBe(
        false,
      );
    });
  });
});
