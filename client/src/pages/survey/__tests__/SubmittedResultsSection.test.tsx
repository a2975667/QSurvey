import React from 'react';
import { Provider } from 'react-redux';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import SubmittedResultsSection from '../components/SubmittedResultsSection';
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';

// Stub visualization-heavy components to avoid ESM deps (d3/vega)
jest.mock(
  '../../../components/results/ResultsVisualizationPanel',
  () => (props: any) => {
    const React = require('react');
    const orderBy = typeof props?.orderBy === 'string' ? props.orderBy : '';
    return React.createElement('div', {
      'data-testid': 'viz-stub',
      'data-order-by': orderBy,
      'data-vote-positive': props?.qvLabels?.aliases?.votePositive || '',
      'data-viewer-options': props.optionSeries
        .filter((series: any) => series.values.some((row: any) => row.id === props.viewerRespondentId))
        .map((series: any) => series.optionId).join(','),
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
    const selfContribution = props?.selfContribution
      ? JSON.stringify(props.selfContribution)
      : '';
    const axisMode = typeof props?.axisMode === 'string' ? props.axisMode : '';
    return React.createElement('div', {
      'data-testid': 'bar-stub',
      'data-order': order,
      'data-self-contribution': selfContribution,
      'data-axis-mode': axisMode,
      'data-total-votes-label': props?.qvLabels?.text?.totalVotes || '',
    });
  },
);

const SURVEY_ID = 'survey-1';
const QUESTION_ID = 'question-1';
const QUESTION_DISABLED_ID = 'question-disabled';
const QUESTION_TEXT_ID = 'question-text';
const SELECTION_ID = 'question-selection';
const APPROVAL_ID = 'question-approval';
const UUID = 'uuid-1';
const VIEWER_CHART_ID = 'chart-viewer';

const createTestStore = () =>
  configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
    },
  });

const mockResponse = (payload: any) => ({
  ok: true,
  json: async () => payload,
});

const resultFetchCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(([url]: any[]) =>
    String(url).includes('/survey/responses/') && String(url).includes('/results?'),
  );

const snapshotPayload = {
  surveyResponseId: 'sr-1',
  uuid: UUID,
  surveyId: SURVEY_ID,
  status: 'Complete',
  submittedAt: '2025-01-01T00:00:00.000Z',
  respondentId: UUID,
  questionResponses: [
    {
      _id: 'qr-1',
      questionId: QUESTION_ID,
      createdTime: '2025-01-01T00:00:00.000Z',
      responseContent: {
        votes: [{ optionId: 'optA', votes: 3 }],
      },
    },
  ],
};

const resultsPayload = {
  meta: {
    surveyId: SURVEY_ID,
    questionId: QUESTION_ID,
    questionType: 'qv',
    viewerRespondentId: VIEWER_CHART_ID,
    optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 3 }],
    counts: { responses: 1, votes: 1, statusFilter: 'Complete' },
  },
  raw: [
    {
      respondentId: VIEWER_CHART_ID,
      optionId: 'optA',
      vote: 3,
    },
  ],
  nextCursor: null,
};

const questionCatalogPayload = {
  questions: [
    {
      id: QUESTION_ID,
      _id: QUESTION_ID,
      label: 'Sample Q',
      question: 'Sample Q',
      type: 'qv',
      respondentResultsEnabled: true,
      options: [{ optionId: 'optA', optionName: 'Option A' }, { optionId: 'optB', optionName: 'Option B' }],
      totalCredits: 100,
      setting: {
        labelOverrides: {
          votePositive: 'supports',
          sortByVotes: 'Sort by Support',
          binLabels: { Positive: 'Support' },
        },
      },
    },
  ],
};

describe('SubmittedResultsSection', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/survey/responses/') && url.includes('/results/questions')) {
        return Promise.resolve(mockResponse(questionCatalogPayload));
      }
      if (url.includes('/survey/responses/') && url.includes('/results')) {
        return Promise.resolve(mockResponse(resultsPayload));
      }
      if (url.includes('/survey/responses/')) {
        return Promise.resolve(mockResponse(snapshotPayload));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('highlights the viewer in refreshed results even when the receipt has an older vote', async () => {
    const store = createTestStore();
    store.dispatch({
      type: 'questions/fetchSampleQuestions/fulfilled',
      meta: { arg: SURVEY_ID },
      payload: [
        {
          _id: QUESTION_ID,
          question: 'Sample Q',
          type: 'qv',
          options: [{ optionId: 'optA', optionName: 'Option A' }],
          setting: { questionType: 'qv', totalCredits: 100, version: 1 },
        },
      ],
    });

    await act(async () => {
      render(
        <Provider store={store}>
          <SubmittedResultsSection
            surveyId={SURVEY_ID}
            uuid={UUID}
            questionResponseIds={{ [QUESTION_ID]: 'qr-1' }}
          />
        </Provider>,
      );
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /refresh results/i })).toBeEnabled(),
    );
    const vizStub = screen.getByTestId('viz-stub');
    const barStub = screen.getByTestId('bar-stub');
    expect(vizStub).toHaveAttribute('data-order-by', 'variance');
    expect(vizStub).toHaveAttribute('data-vote-positive', 'supports');
    expect(vizStub).toHaveAttribute('data-viewer-options', 'optA');
    expect(
      vizStub.compareDocumentPosition(barStub) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const orderSelect = screen.getByLabelText(/order results by/i) as HTMLSelectElement;
    expect(orderSelect.value).toBe('variance');
    fireEvent.change(orderSelect, { target: { value: 'range' } });
    expect(orderSelect.value).toBe('range');
    expect(screen.queryByRole('button', { name: /debug tables/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/my votes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/group summary/i)).not.toBeInTheDocument();

    const fetchCallsBefore = resultFetchCalls().length;
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse({
      meta: {
        ...resultsPayload.meta,
        optionTotals: [{ optionId: 'optB', optionName: 'Option B', sum: 2 }],
      },
      raw: [{ respondentId: VIEWER_CHART_ID, optionId: 'optB', vote: 2 }],
      nextCursor: null,
    }));

    fireEvent.click(screen.getByRole('button', { name: /refresh results/i }));

    await waitFor(() => {
      const fetchCallsAfter = resultFetchCalls().length;
      expect(fetchCallsAfter).toBeGreaterThan(fetchCallsBefore);
      expect(vizStub).toHaveAttribute('data-viewer-options', 'optB');
    });
    expect(barStub).toHaveAttribute('data-self-contribution', '{"optA":3}');
  });

  it('infers selection type from selectedOptionIds and shows percentages', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/survey/responses/') && url.includes('/results/questions')) {
        return Promise.resolve(
          mockResponse({
            questions: [
              {
                id: SELECTION_ID,
                label: 'Choose options',
                type: 'selection',
                respondentResultsEnabled: true,
                options: [
                  { optionId: 'opt1', optionName: 'Option 1' },
                  { optionId: 'opt2', optionName: 'Option 2' },
                ],
              },
            ],
          }),
        );
      }
      if (url.includes('/survey/responses/') && url.includes('/results')) {
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: SELECTION_ID,
              optionTotals: [
                { optionId: 'opt1', optionName: 'Option 1', sum: 2 },
                { optionId: 'opt2', optionName: 'Option 2', sum: 3 },
              ],
              grandTotal: 5,
              counts: { responses: 5, votes: 5, statusFilter: 'Complete' },
            },
            raw: [],
            nextCursor: null,
          }),
        );
      }
      if (url.includes('/survey/responses/')) {
        return Promise.resolve(
          mockResponse({
            surveyResponseId: 'sr-2',
            uuid: UUID,
            surveyId: SURVEY_ID,
            status: 'Complete',
            submittedAt: '2025-01-01T00:00:00.000Z',
            respondentId: UUID,
            questionResponses: [
              {
                _id: 'qr-2',
                questionId: SELECTION_ID,
                createdTime: '2025-01-01T00:00:00.000Z',
                responseContent: {
                  selectedOptionIds: ['opt1'],
                },
              },
            ],
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    const store = createTestStore();

    await act(async () => {
      render(
        <Provider store={store}>
          <SubmittedResultsSection
            surveyId={SURVEY_ID}
            uuid={UUID}
            questionResponseIds={{ [SELECTION_ID]: 'qr-2' }}
          />
        </Provider>,
      );
    });

    await waitFor(() =>
      expect(screen.getByText('Option counts for this question')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /table view/i }));

    expect(screen.getByText('2 (40%)')).toBeInTheDocument();
    expect(screen.getByText('3 (60%)')).toBeInTheDocument();
  });

  it('links peer approvals across pages and highlights only the viewer before switching chart modes', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/survey/responses/') && url.includes('/results/questions')) {
        return Promise.resolve(
          mockResponse({
            questions: [
              {
                id: APPROVAL_ID,
                label: 'Approve options',
                type: 'approval',
                respondentResultsEnabled: true,
                options: [
                  { optionId: 'opt1', optionName: 'Option 1' },
                  { optionId: 'opt2', optionName: 'Option 2' },
                  { optionId: 'opt3', optionName: 'Option 3' },
                ],
              },
            ],
          }),
        );
      }
      if (url.includes('/survey/responses/') && url.includes('/results')) {
        const nextPage = new URL(url, 'https://example.test').searchParams.get('cursor') === 'page-two';
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: APPROVAL_ID,
              questionType: 'approval',
              viewerRespondentId: VIEWER_CHART_ID,
              optionTotals: [
                { optionId: 'opt2', optionName: 'Option 2', sum: 2 },
                { optionId: 'opt1', optionName: 'Option 1', sum: 2 },
              ],
              grandTotal: 4,
              counts: { responses: 3, votes: 4, statusFilter: 'Complete' },
            },
            raw: nextPage
              ? [
                  { respondentId: 'chart-peer', optionId: 'opt2', vote: 1 },
                  { respondentId: 'chart-other', optionId: 'opt1', vote: 1 },
                ]
              : [
                  { respondentId: VIEWER_CHART_ID, optionId: 'opt2', vote: 1 },
                  { respondentId: 'chart-peer', optionId: 'opt1', vote: 1 },
                ],
            nextCursor: nextPage ? null : 'page-two',
          }),
        );
      }
      if (url.includes('/survey/responses/')) {
        return Promise.resolve(
          mockResponse({
            surveyResponseId: 'sr-3',
            uuid: UUID,
            surveyId: SURVEY_ID,
            status: 'Complete',
            submittedAt: '2025-01-01T00:00:00.000Z',
            respondentId: UUID,
            questionResponses: [
              {
                _id: 'qr-3',
                questionId: APPROVAL_ID,
                createdTime: '2025-01-01T00:00:00.000Z',
                responseContent: {
                  approvals: ['opt2'],
                },
              },
            ],
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    const store = createTestStore();
    store.dispatch({
      type: 'questions/fetchSampleQuestions/fulfilled',
      meta: { arg: SURVEY_ID },
      payload: [
        {
          _id: APPROVAL_ID,
          question: 'Approve options',
          type: 'approval',
          options: [
            { optionId: 'opt1', optionName: 'Option 1' },
            { optionId: 'opt2', optionName: 'Option 2' },
            { optionId: 'opt3', optionName: 'Option 3' },
          ],
          setting: { questionType: 'approval', version: 1 },
        },
      ],
    });

    await act(async () => {
      render(
        <Provider store={store}>
          <SubmittedResultsSection
            surveyId={SURVEY_ID}
            uuid={UUID}
            questionResponseIds={{ [APPROVAL_ID]: 'qr-3' }}
          />
        </Provider>,
      );
    });

    await waitFor(() =>
      expect(screen.getByText('Option counts for this question')).toBeInTheDocument(),
    );

    const dots = await screen.findAllByTestId(/approval-dot-/);
    expect(dots).toHaveLength(4);
    expect(dots.filter(dot => dot.dataset.role === 'self').map(dot => dot.dataset.respondentId))
      .toEqual([VIEWER_CHART_ID]);
    const peerDots = dots.filter(dot => dot.dataset.respondentId === 'chart-peer');
    expect(peerDots.map(dot => dot.dataset.optionId).sort()).toEqual(['opt1', 'opt2']);
    fireEvent.mouseEnter(peerDots[0]);
    peerDots.forEach(dot => expect(dot).toHaveClass('is-linked'));
    expect(screen.getByText(/this respondent supports 2 options/i)).toBeInTheDocument();
    expect(screen.queryByTestId('bar-stub')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /chart view/i }));

    const bar = screen.getByTestId('bar-stub');
    expect(bar).toHaveAttribute('data-order', 'opt1,opt2,opt3');
    expect(bar).toHaveAttribute('data-self-contribution', '{"opt2":1}');
    expect(bar).toHaveAttribute('data-axis-mode', 'nonNegative');
    expect(screen.queryByLabelText(/order results by/i)).not.toBeInTheDocument();
  });

  it('shows the expanded empty state and does not fetch aggregates when no enabled supported questions are available', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/survey/responses/') && url.includes('/results/questions')) {
        return Promise.resolve(
          mockResponse({
            questions: [
              {
                id: QUESTION_DISABLED_ID,
                label: 'Disabled results',
                type: 'qv',
                respondentResultsEnabled: false,
                options: [{ optionId: 'optA', optionName: 'Option A' }],
              },
              {
                id: QUESTION_TEXT_ID,
                label: 'Text results unsupported',
                type: 'text',
                respondentResultsEnabled: true,
              },
            ],
          }),
        );
      }
      if (url.includes('/survey/responses/') && !url.includes('/results')) {
        return Promise.resolve(mockResponse(snapshotPayload));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await act(async () => {
      render(
        <Provider store={createTestStore()}>
          <SubmittedResultsSection surveyId={SURVEY_ID} uuid={UUID} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'None of the questions have results enabled for survey respondents. If you think this is an error, please contact the survey administrator.',
        ),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/^question$/i)).not.toBeInTheDocument();
    expect(resultFetchCalls()).toHaveLength(0);
  });

  it('fetches completed-results question catalog without respondent keys', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/survey/responses/') && url.includes('/results/questions')) {
        return Promise.resolve(
          mockResponse({
            questions: [
              {
                id: SELECTION_ID,
                label: 'Choose fallback',
                type: 'selection',
                options: [{ optionId: 'opt1', optionName: 'Option 1' }],
                respondentResultsEnabled: true,
              },
            ],
          }),
        );
      }
      if (url.includes('/survey/responses/') && url.includes('/results')) {
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: SELECTION_ID,
              questionType: 'selection',
              optionTotals: [{ optionId: 'opt1', optionName: 'Option 1', sum: 1 }],
              counts: { responses: 1, votes: 1, statusFilter: 'Complete' },
            },
            raw: [],
            nextCursor: null,
          }),
        );
      }
      if (url.includes('/survey/responses/')) {
        return Promise.resolve(
          mockResponse({
            ...snapshotPayload,
            questionResponses: [
              {
                _id: 'qr-selection',
                questionId: SELECTION_ID,
                createdTime: '2025-01-01T00:00:00.000Z',
                responseContent: { selectedOptionIds: ['opt1'] },
              },
            ],
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await act(async () => {
      render(
        <Provider store={createTestStore()}>
          <SubmittedResultsSection
            surveyId={SURVEY_ID}
            uuid={UUID}
          />
        </Provider>,
      );
    });

    await waitFor(() => {
      const questionCatalogCall = (global.fetch as jest.Mock).mock.calls.find(([url]: any[]) =>
        String(url).includes(`/survey/responses/${UUID}/results/questions`),
      );
      expect(questionCatalogCall).toBeTruthy();
      expect(String(questionCatalogCall[0])).toContain(`surveyId=${SURVEY_ID}`);
      expect(String(questionCatalogCall[0])).not.toContain('sKey=');
      expect(String(questionCatalogCall[0])).not.toContain('uKey=');
      expect(
        (global.fetch as jest.Mock).mock.calls.some(([url]: any[]) =>
          String(url).includes(`/surveys/${SURVEY_ID}`),
        ),
      ).toBe(false);
    });
    await waitFor(() => {
      expect(resultFetchCalls()[0]?.[0]).toEqual(expect.stringContaining(`questionId=${SELECTION_ID}`));
    });
  });

  it('filters disabled and unsupported questions while preserving order and defaulting to the first available question', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/survey/responses/') && url.includes('/results/questions')) {
        return Promise.resolve(
          mockResponse({
            questions: [
              {
                id: QUESTION_DISABLED_ID,
                label: 'Disabled results',
                type: 'qv',
                respondentResultsEnabled: false,
                options: [{ optionId: 'opt-disabled', optionName: 'Disabled' }],
                totalCredits: 100,
              },
              {
                id: QUESTION_TEXT_ID,
                label: 'Unsupported text',
                type: 'text',
                respondentResultsEnabled: true,
              },
              {
                id: APPROVAL_ID,
                label: 'Approval first',
                type: 'approval',
                respondentResultsEnabled: true,
                options: [{ optionId: 'opt-approval', optionName: 'Approval Option' }],
              },
              {
                id: QUESTION_ID,
                label: 'QV second',
                type: 'qv',
                respondentResultsEnabled: true,
                options: [{ optionId: 'optA', optionName: 'Option A' }],
                totalCredits: 100,
              },
            ],
          }),
        );
      }
      if (url.includes('/survey/responses/') && url.includes('/results')) {
        const isApproval = url.includes(`questionId=${APPROVAL_ID}`);
        return Promise.resolve(
          mockResponse({
            meta: {
              surveyId: SURVEY_ID,
              questionId: isApproval ? APPROVAL_ID : QUESTION_ID,
              questionType: isApproval ? 'approval' : 'qv',
              optionTotals: isApproval
                ? [{ optionId: 'opt-approval', optionName: 'Approval Option', sum: 1 }]
                : [{ optionId: 'optA', optionName: 'Option A', sum: 1 }],
              counts: { responses: 1, votes: 1, statusFilter: 'Complete' },
            },
            raw: [],
            nextCursor: null,
          }),
        );
      }
      if (url.includes('/survey/responses/')) {
        return Promise.resolve(
          mockResponse({
            ...snapshotPayload,
            questionResponses: [
              {
                _id: 'qr-approval',
                questionId: APPROVAL_ID,
                createdTime: '2025-01-01T00:00:00.000Z',
                responseContent: { approvals: ['opt-approval'] },
              },
              {
                _id: 'qr-qv',
                questionId: QUESTION_ID,
                createdTime: '2025-01-01T00:00:00.000Z',
                responseContent: { votes: [{ optionId: 'optA', votes: 1 }] },
              },
            ],
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    await act(async () => {
      render(
        <Provider store={createTestStore()}>
          <SubmittedResultsSection surveyId={SURVEY_ID} uuid={UUID} />
        </Provider>,
      );
    });

    const select = (await screen.findByLabelText(/^question$/i)) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Approval first',
      'QV second',
    ]);
    expect(select.value).toBe(APPROVAL_ID);
    await waitFor(() => {
      expect(resultFetchCalls()[0]?.[0]).toEqual(expect.stringContaining(`questionId=${APPROVAL_ID}`));
    });
  });
});
