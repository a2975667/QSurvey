import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import SurveyResultsPage from '../SurveyResultsPage';
import metadataSlice from '../../../features/metadataSlice';
import qsOptionsSlice from '../../../features/qsOptionsSlice';
import questionsSlice from '../../../features/questionsSlice';
import authSlice, { loginSuccess } from '../../../features/authSlice';
import surveysSlice from '../../../features/surveysSlice';

const SURVEY_ID = '680f38261354f9f2000e5db8';
const QUESTION_ID = '680f39a41354f9f2000e5dd2';

const createTestStore = () =>
  configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      qsOptions: qsOptionsSlice.reducer,
      questions: questionsSlice.reducer,
      auth: authSlice.reducer,
      surveys: surveysSlice.reducer,
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
      expect(screen.getByText('Option A')).toBeInTheDocument(),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/protected/surveys/${SURVEY_ID}/results`),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );

    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('uuid-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('loads additional rows when "Load more" is clicked', async () => {
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

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    await waitFor(() =>
      expect(screen.getByText('uuid-2')).toBeInTheDocument(),
    );
  });
});
