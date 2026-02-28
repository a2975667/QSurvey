import React from 'react';
import { Provider } from 'react-redux';

// Test constants used by our router mock
const SURVEY_ID = '680f38261354f9f2000e5db8';
const QUESTION_ID = '680f39a41354f9f2000e5dd2';
const SELECTION_ID = '680f39a41354f9f2000e5dd3';
const APPROVAL_ID = '680f39a41354f9f2000e5dd4';
let mockCurrentQuestionId = QUESTION_ID;
const mockNavigate = jest.fn();

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
      useNavigate: () => mockNavigate,
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
    const orderBy = typeof props?.orderBy === 'string' ? props.orderBy : '';
    return React.createElement('div', {
      'data-testid': 'viz-stub',
      'data-series': ids,
      'data-order-by': orderBy,
    });
  },
);
jest.mock(
  '../../../components/results/OptionTotalsBarChart',
  () => (props: any) => {
    const React = require('react');
    const order = Array.isArray(props?.totals)
      ? props.totals.map((entry: any) => entry.optionId || '').join(',')
      : '';
    const axisMode = typeof props?.axisMode === 'string' ? props.axisMode : '';
    const preserveOrder = props?.preserveOrder === true ? 'true' : 'false';
    return React.createElement('div', {
      'data-testid': 'bar-stub',
      'data-order': order,
      'data-axis-mode': axisMode,
      'data-preserve-order': preserveOrder,
    });
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
  // Seed questions with totalCredits to avoid fetching them in tests
  store.dispatch({
    type: 'questions/fetchSampleQuestions/fulfilled',
    payload: mockQuestionPayload.questions,
  });

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

const mockQuestionPayload = {
  questions: [
    {
      _id: QUESTION_ID,
      question: 'Where to host?',
      description: 'Pick a city',
      type: 'qv',
      options: [
        { optionId: 'optA', optionName: 'Option A', description: '' },
        { optionId: 'optB', optionName: 'Option B', description: '' },
      ],
      setting: { questionType: 'qv', totalCredits: 100, version: 1, isAvailable: true },
    },
    {
      _id: 'Q2',
      question: 'Second Q',
      description: 'Another',
      type: 'qv',
      options: [
        { optionId: 'optB', optionName: 'Option B', description: '' },
      ],
      setting: { questionType: 'qv', totalCredits: 64, version: 1, isAvailable: true },
    },
    {
      _id: SELECTION_ID,
      question: 'Pick a snack',
      description: 'Choose one',
      type: 'selection',
      options: [
        { optionId: 'optC', optionName: 'Option C', description: '' },
        { optionId: 'optD', optionName: 'Option D', description: '' },
      ],
      setting: { questionType: 'selection', version: 1, isAvailable: true },
    },
    {
      _id: APPROVAL_ID,
      question: 'Approve options',
      description: 'Approve any',
      type: 'approval',
      maxApprovals: 1,
      options: [
        { optionId: 'optC', optionName: 'Option C', description: '' },
        { optionId: 'optB', optionName: 'Option B', description: '' },
        { optionId: 'optA', optionName: 'Option A', description: '' },
      ],
      setting: { questionType: 'approval', version: 1, isAvailable: true },
    },
  ],
};

const buildResultsPayload = (questionId: string, optionTotals: any[], raw: any[], nextCursor: string | null = null) => ({
  meta: {
    surveyId: SURVEY_ID,
    questionId,
    optionTotals,
    grandTotal: optionTotals.reduce((acc, o) => acc + (Number(o.sum) || 0), 0),
    counts: {
      responses: raw.length,
      votes: raw.length,
      statusFilter: 'Complete',
    },
  },
  raw,
  nextCursor,
});

describe('SurveyResultsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockCurrentQuestionId = QUESTION_ID;
  });

  it('displays totals and raw votes from the API response', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        return Promise.resolve(
          mockResponse(
            buildResultsPayload(
              QUESTION_ID,
              [
                { optionId: 'optA', optionName: 'Option A', sum: 47 },
                { optionId: 'optB', optionName: 'Option B', sum: -12 },
              ],
              [
                {
                  respondentId: 'uuid-1',
                  responseId: 'resp-1',
                  optionId: 'optA',
                  vote: 5,
                  at: '2025-04-28T10:46:13.545Z',
                },
              ],
              null,
            ),
          ),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    await renderWithProviders();

    await waitFor(() => expect(screen.getAllByText('Option A').length).toBeGreaterThan(0));
    const vizStub = screen.getByTestId('viz-stub');
    const barStub = screen.getByTestId('bar-stub');
    expect(vizStub).toHaveAttribute('data-order-by', 'variance');
    expect(
      vizStub.compareDocumentPosition(barStub) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const orderSelect = screen.getByLabelText(/order results by/i) as HTMLSelectElement;
    expect(orderSelect.value).toBe('variance');
    fireEvent.change(orderSelect, { target: { value: 'range' } });
    expect(orderSelect.value).toBe('range');
    fireEvent.click(screen.getByRole('button', { name: /table view/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/protected/surveys/${SURVEY_ID}/results`),
      expect.objectContaining({
        headers: expect.objectContaining({
          map: expect.objectContaining({ authorization: expect.any(String) }),
        }),
      }),
    );

    expect(screen.getAllByText('Option B').length).toBeGreaterThan(0);
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('uuid-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('fetches all pages and renders combined rows', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        const callCount = (global.fetch as jest.Mock).mock.calls.filter(([u]: any[]) =>
          String(u).includes('/protected/surveys/'),
        ).length;
        if (callCount === 0) {
          return Promise.resolve(
            mockResponse(
              buildResultsPayload(
                QUESTION_ID,
                [{ optionId: 'optA', optionName: 'Option A', sum: 47 }],
                [
                  {
                    respondentId: 'uuid-1',
                    responseId: 'resp-1',
                    optionId: 'optA',
                    vote: 5,
                    at: '2025-04-28T10:46:13.545Z',
                  },
                ],
                'cursor-123',
              ),
            ),
          );
        }
        return Promise.resolve(
          mockResponse(
            buildResultsPayload(
              QUESTION_ID,
              [{ optionId: 'optA', optionName: 'Option A', sum: 47 }],
              [
                {
                  respondentId: 'uuid-2',
                  responseId: 'resp-2',
                  optionId: 'optA',
                  vote: -2,
                  at: '2025-04-29T10:00:00.000Z',
                },
              ],
              null,
            ),
          ),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    await renderWithProviders();

    await screen.findByText('uuid-2');
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('excludes foreign optionIds from visualization series', async () => {
    // meta only contains optA; raw includes a row for optB (foreign)
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        return Promise.resolve(
          mockResponse(
            buildResultsPayload(
              QUESTION_ID,
              [{ optionId: 'optA', optionName: 'Option A', sum: 10 }],
              [
                { respondentId: 'uuid-1', responseId: 'r1', optionId: 'optA', vote: 3, at: '2025-01-01T00:00:00.000Z' },
                { respondentId: 'uuid-1', responseId: 'r1', optionId: 'optB', vote: 4, at: '2025-01-01T00:00:01.000Z' },
              ],
              null,
            ),
          ),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    await renderWithProviders();
    const viz = await screen.findByTestId('viz-stub');
    expect(viz).toHaveAttribute('data-series', 'optA');
  });

  it('resets and renders new data when questionId changes', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        const urlObj = new URL(url);
        const requestedQid = urlObj.searchParams.get('questionId') || QUESTION_ID;
        if (requestedQid === QUESTION_ID) {
          return Promise.resolve(
            mockResponse(
              buildResultsPayload(
                QUESTION_ID,
                [{ optionId: 'optA', optionName: 'Option A', sum: 5 }],
                [
                  { respondentId: 'uuid-1', responseId: 'r1', optionId: 'optA', vote: 5, at: '2025-01-01T00:00:00.000Z' },
                ],
                null,
              ),
            ),
          );
        }
        return Promise.resolve(
          mockResponse(
            buildResultsPayload(
              requestedQid,
              [{ optionId: 'optB', optionName: 'Option B', sum: -2 }],
              [
                { respondentId: 'uuid-2', responseId: 'r2', optionId: 'optB', vote: -2, at: '2025-01-01T00:00:02.000Z' },
              ],
              null,
            ),
          ),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    const { store, rerender } = await renderWithProviders();

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
    const viz = screen.getByTestId('viz-stub');
    expect(viz).toHaveAttribute('data-series', 'optB');
  });

  it('shows selection counts with respondent percentages', async () => {
    mockCurrentQuestionId = SELECTION_ID;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: SELECTION_ID,
              questionType: 'selection',
              optionTotals: [
                { optionId: 'optC', optionName: 'Option C', sum: 2 },
                { optionId: 'optD', optionName: 'Option D', sum: 3 },
              ],
              grandTotal: 5,
              counts: { responses: 5, votes: 5, statusFilter: 'Complete' },
            },
            raw: [],
            nextCursor: null,
          }),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    await renderWithProviders();

    await waitFor(() => expect(screen.getByText('Per-option counts')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /table view/i }));

    await waitFor(() => expect(screen.getByText('Option C')).toBeInTheDocument());

    expect(screen.getByText('2 (40%)')).toBeInTheDocument();
    expect(screen.getByText('3 (60%)')).toBeInTheDocument();
  });

  it('logs out and redirects on protected results 401', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
          headers: { get: () => null },
        });
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    const { store } = await renderWithProviders();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.token).toBeNull();
    });
  });

  it('renders approval totals in bar chart and orders by total with original-order ties', async () => {
    mockCurrentQuestionId = APPROVAL_ID;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: APPROVAL_ID,
              questionType: 'approval',
              optionTotals: [
                { optionId: 'optB', optionName: 'Option B', sum: 7 },
                { optionId: 'optA', optionName: 'Option A', sum: 5 },
                { optionId: 'optC', optionName: 'Option C', sum: 7 },
              ],
              grandTotal: 19,
              counts: { responses: 10, votes: 19, statusFilter: 'Complete' },
            },
            raw: [],
            nextCursor: null,
          }),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    await renderWithProviders();

    await waitFor(() => expect(screen.getByText('Per-option counts')).toBeInTheDocument());
    expect(screen.queryByTestId('viz-stub')).not.toBeInTheDocument();
    const bar = screen.getByTestId('bar-stub');
    expect(bar).toHaveAttribute('data-order', 'optC,optB,optA');
    expect(bar).toHaveAttribute('data-axis-mode', 'nonNegative');
    expect(bar).toHaveAttribute('data-preserve-order', 'true');
  });

  it('shows approval warning when legacy respondent rows exceed current cap', async () => {
    mockCurrentQuestionId = APPROVAL_ID;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/protected/surveys/')) {
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: APPROVAL_ID,
              questionType: 'approval',
              optionTotals: [
                { optionId: 'optA', optionName: 'Option A', sum: 3 },
                { optionId: 'optB', optionName: 'Option B', sum: 2 },
              ],
              grandTotal: 5,
              counts: { responses: 2, votes: 5, statusFilter: 'Complete' },
            },
            raw: [
              {
                respondentId: 'user-1',
                responseId: 'resp-1',
                optionId: 'optA',
                at: '2025-04-28T10:46:13.545Z',
              },
              {
                respondentId: 'user-1',
                responseId: 'resp-1',
                optionId: 'optB',
                at: '2025-04-28T10:46:13.545Z',
              },
            ],
            nextCursor: null,
          }),
        );
      }
      return Promise.resolve(mockResponse(mockQuestionPayload));
    });

    await renderWithProviders();

    await waitFor(() => expect(screen.getByText('Per-option counts')).toBeInTheDocument());
    expect(
      screen.getByText(
        'Warning: Some legacy submissions exceed the current approval cap. Totals may not match the current rule exactly.',
      ),
    ).toBeInTheDocument();
  });
});
