import React from 'react';
import { Provider } from 'react-redux';

// Test constants used by our router mock
const SURVEY_ID = '680f38261354f9f2000e5db8';
const QUESTION_ID = '680f39a41354f9f2000e5dd2';
let mockCurrentQuestionId = QUESTION_ID;

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
      useSearchParams: () => [new URLSearchParams(`questionId=${mockCurrentQuestionId}`), jest.fn()],
      useNavigate: () => jest.fn(),
      Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
  },
  { virtual: true },
);

// Stub visualization-heavy components to avoid pulling ESM deps (d3/vega)
jest.mock(
  '../../../components/results/ResultsVisualizationPanel',
  () => (props: any) => {
    const React = require('react');
    const ids = Array.isArray(props?.optionSeries)
      ? props.optionSeries.map((s: any) => s.optionId).join(',')
      : '';
    return React.createElement('div', { 'data-testid': 'viz-stub', 'data-series': ids });
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

  it('excludes foreign optionIds from visualization series', async () => {
    // meta only contains optA; raw includes a row for optB (foreign)
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        meta: {
          surveyId: SURVEY_ID,
          questionId: QUESTION_ID,
          optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 10 }],
          grandTotal: 10,
          counts: { responses: 5, votes: 5, statusFilter: 'Complete' },
        },
        raw: [
          { respondentId: 'uuid-1', responseId: 'r1', optionId: 'optA', vote: 3, at: '2025-01-01T00:00:00.000Z' },
          { respondentId: 'uuid-1', responseId: 'r1', optionId: 'optB', vote: 4, at: '2025-01-01T00:00:01.000Z' },
        ],
        nextCursor: null,
      }),
    );

    await renderWithProviders();
    const viz = await screen.findByTestId('viz-stub');
    expect(viz).toHaveAttribute('data-series', 'optA');
  });

  it('resets and renders new data when questionId changes', async () => {
    // First load for Q1
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          meta: {
            surveyId: SURVEY_ID,
            questionId: QUESTION_ID,
            optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 5 }],
            grandTotal: 5,
            counts: { responses: 2, votes: 2, statusFilter: 'Complete' },
          },
          raw: [
            { respondentId: 'uuid-1', responseId: 'r1', optionId: 'optA', vote: 5, at: '2025-01-01T00:00:00.000Z' },
          ],
          nextCursor: null,
        }),
      )
      // Second load for Q2
      .mockResolvedValueOnce(
        mockResponse({
          meta: {
            surveyId: SURVEY_ID,
            questionId: 'Q2',
            optionTotals: [{ optionId: 'optB', optionName: 'Option B', sum: -2 }],
            grandTotal: -2,
            counts: { responses: 1, votes: 1, statusFilter: 'Complete' },
          },
          raw: [
            { respondentId: 'uuid-2', responseId: 'r2', optionId: 'optB', vote: -2, at: '2025-01-01T00:00:02.000Z' },
          ],
          nextCursor: null,
        }),
      );

    const { store, rerender } = await renderWithProviders();

    // First question assertions
    await screen.findByText('uuid-1');
    let viz = screen.getByTestId('viz-stub');
    expect(viz).toHaveAttribute('data-series', 'optA');

    // Change question id in the mocked router and rerender
    mockCurrentQuestionId = 'Q2';
    rerender(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/designer/results/${SURVEY_ID}?questionId=Q2`]}>
          <Routes>
            <Route path="/designer/results/:surveyId" element={<SurveyResultsPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    // Wait for the second fetch to render
    await screen.findByText('uuid-2');
    viz = screen.getByTestId('viz-stub');
    expect(viz).toHaveAttribute('data-series', 'optB');
    // Ensure the previous raw row is not present anymore
    expect(screen.queryByText('uuid-1')).not.toBeInTheDocument();
  });
});
