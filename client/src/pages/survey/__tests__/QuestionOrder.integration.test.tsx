import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import SurveyView from '../SurveyView';
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer from '../../../features/unifiedResponsesSlice';
import authReducer from '../../../features/authSlice';
import { fetchMetaData } from '../../../features/metadataSlice';
import { fetchSampleQuestions } from '../../../features/questionsSlice';
import { fetchSurveyData } from '../../../features/surveysSlice';

const SURVEY_ID = 'survey-1';
const mockNavigate = jest.fn();
const mockQvPropsSpy = jest.fn();

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      __esModule: true,
      useSearchParams: () => [new URLSearchParams(), jest.fn()],
      useNavigate: () => mockNavigate,
      useParams: () => ({ id: SURVEY_ID }),
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

// Capture QV questionIds passed into the respondent view
jest.mock('../components/QuadraticSurveyPage', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({
      onCompleteLastQuestion,
      questionIds,
    }: {
      onCompleteLastQuestion?: (result?: { surveyResponseId: string; uuid: string }) => void;
      questionIds?: string[];
    }) => {
      mockQvPropsSpy(questionIds);
      return React.createElement(
        'div',
        { 'data-testid': 'qv-module' },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () =>
              onCompleteLastQuestion &&
              onCompleteLastQuestion({ surveyResponseId: 'resp-1', uuid: 'uuid-1' }),
          },
          'Complete QV',
        ),
      );
    },
  };
});

jest.mock('../../../components/QsNavBar/submission', () => ({
  __esModule: true,
  submitQvQuestion: jest.fn(async () => ({ surveyResponseId: 'resp-1', uuid: 'uuid-1' })),
  completeSurveySubmission: jest.fn(async () => {}),
}));

jest.mock('../../../features/questionsSlice', () => {
  const actual = jest.requireActual('../../../features/questionsSlice');
  const payload = [
    {
      _id: 'text-1',
      question: 'Context question',
      description: 'Provide context',
      type: 'text',
      position: 2,
      multiline: false,
    },
    {
      _id: 'qv-1',
      question: 'Main QV',
      description: '',
      type: 'qv',
      position: 0,
      options: [
        { optionId: 'a', optionName: 'Alpha', description: 'A' },
        { optionId: 'b', optionName: 'Beta', description: 'B' },
      ],
      setting: { questionType: 'qv', totalCredits: 10, version: 1, isAvailable: true },
    },
    {
      _id: 'likert-1',
      question: 'Follow-up',
      description: 'Rate it',
      type: 'likert',
      position: 1,
      scale: ['1', '2', '3'],
      minLabel: 'Low',
      maxLabel: 'High',
    },
  ];
  const fetchSampleQuestions = (...args: any[]) => ({
    type: 'questions/fetchSampleQuestions/fulfilled',
    payload,
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

jest.mock('../../../features/metadataSlice', () => {
  const actual = jest.requireActual('../../../features/metadataSlice');
  const fetchMetaData = (...args: any[]) => ({
    type: 'questions/fetchMetaData/fulfilled',
    payload: { _id: SURVEY_ID, surveyId: SURVEY_ID, settings: { isAvailable: true }, sKey: null, uKey: null, uuid: null, resumeUuid: null },
    meta: { arg: args[0] },
  });
  (fetchMetaData as any).pending = { type: 'questions/fetchMetaData/pending' };
  (fetchMetaData as any).fulfilled = { type: 'questions/fetchMetaData/fulfilled', match: () => true };
  (fetchMetaData as any).rejected = { type: 'questions/fetchMetaData/rejected', match: () => false };

  return {
    __esModule: true,
    ...actual,
    fetchMetaData,
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

jest.mock('../../../features/options/api/options.api', () => {
  const makeMockAction = (typePrefix: string) => {
    const fn: any = jest.fn((payload: any) => ({
      type: `${typePrefix}/fulfilled`,
      payload,
      meta: { arg: payload },
    }));
    fn.pending = { type: `${typePrefix}/pending`, match: (action: any) => action?.type === `${typePrefix}/pending` };
    fn.fulfilled = { type: `${typePrefix}/fulfilled`, match: (action: any) => action?.type === `${typePrefix}/fulfilled` };
    fn.rejected = { type: `${typePrefix}/rejected`, match: (action: any) => action?.type === `${typePrefix}/rejected` };
    return fn;
  };

  return {
    __esModule: true,
    submitBatchQuestionResponses: makeMockAction('options/submitBatchQuestionResponses'),
    fetchSurveyResponseByUUID: makeMockAction('options/fetchSurveyResponseByUUID'),
    submitInitialQuestionResponse: makeMockAction('options/submitInitialQuestionResponse'),
    submitAdditionalQuestionResponse: makeMockAction('options/submitAdditionalQuestionResponse'),
    updateQuestionResponse: makeMockAction('options/updateQuestionResponse'),
    completeSurveyResponse: makeMockAction('options/completeSurveyResponse'),
    submitBatchQuestionResponsesAsync: makeMockAction('options/submitBatchQuestionResponsesAsync'),
  };
});

const buildStore = () => {
  return configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
      auth: authReducer.reducer,
    },
  });
};

describe('Respondent ordering respects survey.questions sequence', () => {
  beforeEach(() => {
    mockQvPropsSpy.mockClear();
    mockNavigate.mockClear();
  });

  it('steps through Text → QV → Likert in the provided order', async () => {
    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    // First segment: text question only
    const textInput = await screen.findByPlaceholderText('Type your answer here...');
    fireEvent.change(textInput, { target: { value: 'My context answer' } });

    const submitFirst = screen.getByRole('button', { name: /submit responses/i });
    fireEvent.click(submitFirst);

    // Second segment: QV module should appear next
    await waitFor(() => expect(screen.getByTestId('qv-module')).toBeInTheDocument());
    expect(mockQvPropsSpy).toHaveBeenCalledWith(['qv-1']);
    fireEvent.click(screen.getByRole('button', { name: /complete qv/i }));

    // Third segment: Likert question renders after QV
    await screen.findByText('Follow-up');
    expect(mockNavigate).not.toHaveBeenCalledWith(`/survey/${SURVEY_ID}/complete`);
  });
});
