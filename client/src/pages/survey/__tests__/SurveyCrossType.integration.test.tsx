import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
const SURVEY_ID = 'survey-1';

const backendQuestions = [
  {
    _id: 'qv1',
    question: 'QV Question',
    description: '',
    type: 'qv',
    position: 0,
    options: [
      { optionId: 'o1', optionName: 'Alpha', description: '' },
      { optionId: 'o2', optionName: 'Beta', description: '' },
    ],
    setting: { questionType: 'qv', totalCredits: 10, version: 1, isAvailable: true },
  },
  {
    _id: 'likert1',
    question: 'Likert Question',
    description: '',
    type: 'likert',
    position: 1,
    scale: ['1', '2', '3'],
    minLabel: 'Low',
    maxLabel: 'High',
  },
];

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      useSearchParams: () => [new URLSearchParams(), jest.fn()],
      useNavigate: () => jest.fn(),
      useParams: () => ({ id: 'survey-1' }),
      Link: ({ children, to }: { children: React.ReactNode; to?: string }) =>
        React.createElement('a', { href: to || '#' }, children),
    };
  },
  { virtual: true },
);

jest.mock('react-vega', () => {
  const React = require('react');
  return {
    __esModule: true,
    VegaLite: () => React.createElement('div', { 'data-testid': 'vega-lite-stub' }),
    Vega: () => React.createElement('div', { 'data-testid': 'vega-stub' }),
  };
}, { virtual: true });

jest.mock('../components/SurveyCompletePage', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'survey-complete-stub' }),
  };
});

jest.mock('../../../features/metadataSlice', () => {
  const actual = jest.requireActual('../../../features/metadataSlice');
  const fulfilledPayload = {
    _id: SURVEY_ID,
    surveyId: SURVEY_ID,
    settings: { isAvailable: true },
    sKey: null,
    uKey: null,
    uuid: null,
    resumeUuid: null,
  };
  const fetchMetaData = (...args: any[]) => ({
    type: 'metadata/fetchMetaData/fulfilled',
    payload: fulfilledPayload,
    meta: { arg: args[0] },
  });
  (fetchMetaData as any).pending = { type: 'metadata/fetchMetaData/pending' };
  (fetchMetaData as any).fulfilled = { type: 'metadata/fetchMetaData/fulfilled', match: () => true };
  (fetchMetaData as any).rejected = { type: 'metadata/fetchMetaData/rejected', match: () => false };

  return {
    __esModule: true,
    ...actual,
    fetchMetaData,
  };
});

jest.mock('../../../features/questionsSlice', () => {
  const actual = jest.requireActual('../../../features/questionsSlice');
  const fetchSampleQuestions = (...args: any[]) => ({
    type: 'questions/fetchSampleQuestions/fulfilled',
    payload: backendQuestions,
    meta: { arg: args[0] },
  });
  (fetchSampleQuestions as any).pending = { type: 'questions/fetchSampleQuestions/pending' };
  (fetchSampleQuestions as any).fulfilled = { type: 'questions/fetchSampleQuestions/fulfilled', match: () => true };
  (fetchSampleQuestions as any).rejected = { type: 'questions/fetchSampleQuestions/rejected', match: () => false };

  return {
    __esModule: true,
    ...actual,
    fetchSampleQuestions,
  };
});

jest.mock('../../../features/surveysSlice', () => {
  const actual = jest.requireActual('../../../features/surveysSlice');
  const fetchSurveyData = (...args: any[]) => ({
    type: 'surveys/fetchSurveyData/fulfilled',
    payload: { questionGroups: [] },
    meta: { arg: args[0] },
  });
  (fetchSurveyData as any).pending = { type: 'surveys/fetchSurveyData/pending' };
  (fetchSurveyData as any).fulfilled = { type: 'surveys/fetchSurveyData/fulfilled', match: () => true };
  (fetchSurveyData as any).rejected = { type: 'surveys/fetchSurveyData/rejected', match: () => false };

  return {
    __esModule: true,
    ...actual,
    fetchSurveyData,
  };
});

jest.mock('../../../components/QsNavBar/submission', () => ({
  __esModule: true,
  submitQvQuestion: jest.fn(async () => {}),
  completeSurveySubmission: jest.fn(async () => {}),
}));

jest.mock('../../../features/options/api/options.api', () => {
  type MockThunkResult = {
    status?: 'fulfilled' | 'rejected';
    payload?: any;
    error?: any;
  };

  const makeMockThunk = (typePrefix: string) => {
    const queue: MockThunkResult[] = [];
    const fn: any = jest.fn();

    const attachImplementation = () => {
      fn.mockImplementation((payload: any) => {
        return (dispatch: any) => {
          const next = queue.length ? queue.shift()! : { status: 'fulfilled', payload: {} };
          const meta = { arg: payload };

          if (next.status === 'rejected') {
            const action = {
              type: `${typePrefix}/rejected`,
              payload: next.payload,
              meta,
              error: next.error ?? { message: 'Rejected' },
            };
            dispatch(action);
            return Promise.resolve(action);
          }

          const payloadValue = typeof next.payload === 'function' ? next.payload(payload) : next.payload ?? {};
          const action = {
            type: `${typePrefix}/fulfilled`,
            payload: payloadValue,
            meta,
          };
          dispatch(action);
          return Promise.resolve(action);
        };
      });
    };

    attachImplementation();

    fn.pending = { type: `${typePrefix}/pending`, match: (action: any) => action?.type === `${typePrefix}/pending` };
    fn.fulfilled = { type: `${typePrefix}/fulfilled`, match: (action: any) => action?.type === `${typePrefix}/fulfilled` };
    fn.rejected = { type: `${typePrefix}/rejected`, match: (action: any) => action?.type === `${typePrefix}/rejected` };
    fn.__pushResponse = (entry: MockThunkResult | MockThunkResult[]) => {
      if (Array.isArray(entry)) {
        queue.push(...entry);
      } else {
        queue.push(entry);
      }
    };
    fn.__clear = () => {
      queue.splice(0, queue.length);
    };
    fn.__attach = attachImplementation;
    return fn;
  };

  return {
    submitInitialQuestionResponse: makeMockThunk('options/submitInitialQuestionResponse'),
    submitAdditionalQuestionResponse: makeMockThunk('options/submitAdditionalQuestionResponse'),
    updateQuestionResponse: makeMockThunk('options/updateQuestionResponse'),
    submitBatchQuestionResponses: makeMockThunk('options/submitBatchQuestionResponses'),
    fetchSurveyResponseByUUID: makeMockThunk('options/fetchSurveyResponseByUUID'),
    completeSurveyResponse: makeMockThunk('options/completeSurveyResponse'),
  };
});

import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer, { seedQvQuestion, qvSetBinsConfig, syncQvNavigator } from '../../../features/unifiedResponsesSlice';
import authReducer from '../../../features/authSlice';
import SurveyView from '../SurveyView';

const buildStore = () => {
  return configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
      auth: (state = { isAuthenticated: false, token: null, user: null }) => state,
    },
  });
};

describe('SurveyView cross-type progression', () => {
  it('advances from QV module to non-QV module after submission', async () => {
    const store = buildStore();

    // Seed metadata with survey info
    store.dispatch({
      type: 'questions/fetchMetaData/fulfilled',
      payload: { _id: SURVEY_ID, surveyId: SURVEY_ID, settings: { isAvailable: true }, sKey: null, uKey: null, uuid: null, resumeUuid: null },
    });
    store.dispatch({
      type: 'metadata/fetchMetaData/fulfilled',
      payload: { _id: SURVEY_ID, surveyId: SURVEY_ID, settings: { isAvailable: true }, sKey: null, uKey: null, uuid: null, resumeUuid: null },
    });

    // Seed questions: one QV and one likert
    store.dispatch({ type: 'questions/fetchSampleQuestions/fulfilled', payload: backendQuestions });

    store.dispatch(
      seedQvQuestion({
        questionId: 'qv1',
        totalCredits: 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: backendQuestions[0].options.map((opt, idx) => ({
          optionId: opt.optionId,
          optionName: opt.optionName,
          groupPosition: idx,
          globalPosition: idx,
          votes: 0,
        })),
      }),
    );

    store.dispatch(
      qvSetBinsConfig({
        questionId: 'qv1',
        bins: { hasUndecided: true, hasSkip: true, userDefined: ['Positive', 'Negative'] },
        categoriesOrder: ['Undecided', 'Positive', 'Negative', 'Skip'],
      }),
    );

    store.dispatch(syncQvNavigator({ order: ['qv1'], activeQuestionId: 'qv1' }));

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    // Begin survey
    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));
    const votingButton = screen.getByRole('button', { name: /voting/i });
    fireEvent.click(votingButton);
    fireEvent.click(votingButton);

    // Button should indicate next module (since likert follows)
    const primaryButton = await screen.findByRole('button', { name: /next module/i });
    fireEvent.click(primaryButton);

    await waitFor(() => {
      expect(screen.getByText(/Likert Question/i)).toBeInTheDocument();
    });
  });
});
