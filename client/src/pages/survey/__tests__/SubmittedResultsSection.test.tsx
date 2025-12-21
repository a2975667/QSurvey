import React, { act } from 'react';
import { Provider } from 'react-redux';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import SubmittedResultsSection from '../components/SubmittedResultsSection';
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';

// Stub visualization-heavy components to avoid ESM deps (d3/vega)
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

const SURVEY_ID = 'survey-1';
const QUESTION_ID = 'question-1';
const UUID = 'uuid-1';

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
    optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 3 }],
    counts: { responses: 1, votes: 1, statusFilter: 'Complete' },
  },
  raw: [
    {
      respondentId: UUID,
      responseId: 'resp-1',
      optionId: 'optA',
      vote: 3,
      at: '2025-01-01T00:00:00.000Z',
    },
  ],
  nextCursor: null,
};

describe('SubmittedResultsSection', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
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

  it('refetches aggregated results when Refresh is clicked', async () => {
    const store = createTestStore();
    store.dispatch({
      type: 'questions/fetchSampleQuestions/fulfilled',
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

    const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.filter(([url]: any[]) =>
      String(url).includes('/results'),
    ).length;

    fireEvent.click(screen.getByRole('button', { name: /refresh results/i }));

    await waitFor(() => {
      const fetchCallsAfter = (global.fetch as jest.Mock).mock.calls.filter(([url]: any[]) =>
        String(url).includes('/results'),
      ).length;
      expect(fetchCallsAfter).toBeGreaterThan(fetchCallsBefore);
    });
  });
});
