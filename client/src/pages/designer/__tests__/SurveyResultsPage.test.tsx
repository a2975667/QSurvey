import React from 'react';
import { Provider } from 'react-redux';

// Test constants used by our router mock
const SURVEY_ID = '680f38261354f9f2000e5db8';
const QUESTION_ID = '680f39a41354f9f2000e5dd2';

// Mock react-router-dom to avoid ESM resolution issues in Jest and to provide params
jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Route: ({ element }: { element?: React.ReactElement }) => element ?? null,
      useParams: () => ({ surveyId: SURVEY_ID }),
      useSearchParams: () => [new URLSearchParams(`questionId=${QUESTION_ID}`), jest.fn()],
      useNavigate: () => jest.fn(),
      Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
  },
  { virtual: true },
);

// Stub visualization-heavy components to avoid pulling ESM deps (d3/vega)
jest.mock(
  '../../../components/results/ResultsVisualizationPanel',
  () => () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'viz-stub' });
  },
);
jest.mock(
  '../../../components/results/OptionTotalsBarChart',
  () => () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'bar-stub' });
  },
);

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import SurveyResultsPage from '../SurveyResultsPage';
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import authSlice, { loginSuccess } from '../../../features/authSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';

const createTestStore = () =>
  configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      auth: authSlice.reducer,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
    },
  });

const renderWithProviders = async () => {
  const store = createTestStore();
  store.dispatch(
    loginSuccess({
      token: 'test-token',
      user: { id: 'user-1', email: 'user@test.dev', roles: ['designer'] },
    }),
  );

  const ui = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/designer/results/${SURVEY_ID}?questionId=${QUESTION_ID}`]}>
        <Routes>
          <Route path="/designer/results/:surveyId" element={<SurveyResultsPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

  return { store, ...ui };
};

const mockResponse = (payload: any) => ({
  ok: true,
  json: async () => payload,
  headers: {
    get: () => null,
  },
});

describe('SurveyResultsPage', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('displays totals and raw votes from the API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        meta: {
          surveyId: SURVEY_ID,
          questionId: QUESTION_ID,
          optionTotals: [
            { optionId: 'optA', optionName: 'Option A', sum: 47 },
            { optionId: 'optB', optionName: 'Option B', sum: -12 },
          ],
          grandTotal: 35,
          counts: {
            responses: 36,
            votes: 18,
            statusFilter: 'Complete',
          },
        },
        raw: [
          {
            respondentId: 'uuid-1',
            responseId: 'resp-1',
            optionId: 'optA',
            vote: 5,
            at: '2025-04-28T10:46:13.545Z',
          },
        ],
        nextCursor: null,
      }),
    );

    await renderWithProviders();

    await waitFor(() =>
      expect(screen.getAllByText('Option A').length).toBeGreaterThan(0),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/protected/surveys/${SURVEY_ID}/results`),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );

    expect(screen.getAllByText('Option B').length).toBeGreaterThan(0);
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('uuid-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('fetches all pages and renders combined rows', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          meta: {
            surveyId: SURVEY_ID,
            questionId: QUESTION_ID,
            optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 47 }],
            grandTotal: 47,
            counts: {
              responses: 10,
              votes: 10,
              statusFilter: 'Complete',
            },
          },
          raw: [
            {
              respondentId: 'uuid-1',
              responseId: 'resp-1',
              optionId: 'optA',
              vote: 5,
              at: '2025-04-28T10:46:13.545Z',
            },
          ],
          nextCursor: 'cursor-123',
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          meta: {
            surveyId: SURVEY_ID,
            questionId: QUESTION_ID,
            optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 47 }],
            grandTotal: 47,
            counts: {
              responses: 10,
              votes: 10,
              statusFilter: 'Complete',
            },
          },
          raw: [
            {
              respondentId: 'uuid-2',
              responseId: 'resp-2',
              optionId: 'optA',
              vote: -2,
              at: '2025-04-29T10:00:00.000Z',
            },
          ],
          nextCursor: null,
        }),
      );

    await renderWithProviders();

    // Implementation fetches all pages eagerly; no Load More button should remain
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    expect(screen.getByText('uuid-2')).toBeInTheDocument();
  });
});
