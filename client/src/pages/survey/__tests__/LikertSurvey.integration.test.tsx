import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import SurveyView from '../SurveyView';
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer, { setLikertSelection } from '../../../features/unifiedResponsesSlice';
import authReducer from '../../../features/authSlice';
import { fetchMetaData } from '../../../features/metadataSlice';
import { fetchSampleQuestions } from '../../../features/questionsSlice';
import { fetchSurveyData } from '../../../features/surveysSlice';

const SURVEY_ID = 'survey-1';
const mockNavigate = jest.fn();

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

// Stub QV module so we can detect activation without pulling in the heavy UI
jest.mock('../components/QuadraticSurveyPage', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onCompleteLastQuestion }: { onCompleteLastQuestion?: () => void }) =>
      React.createElement(
        'div',
        { 'data-testid': 'qv-module' },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => onCompleteLastQuestion && onCompleteLastQuestion(),
          },
          'Complete QV',
        ),
      ),
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
      _id: 'likert-1',
      question: 'Satisfaction',
      description: 'Rate it',
      type: 'likert',
      position: 0,
      scale: ['1', '2', '3'],
      minLabel: 'Low',
      maxLabel: 'High',
    },
    {
      _id: 'qv-1',
      question: 'Pick options',
      description: '',
      type: 'qv',
      position: 1,
      options: [
        { optionId: 'a', optionName: 'Alpha', description: 'A' },
        { optionId: 'b', optionName: 'Beta', description: 'B' },
      ],
      setting: { questionType: 'qv', totalCredits: 10, version: 1, isAvailable: true },
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

describe('SurveyView Likert rendering and submission flow', () => {
  it('renders likert first when ordered before QV and routes to QV after submission', async () => {
    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);
    store.dispatch(setLikertSelection({ questionId: 'likert-1', selection: '' }));

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    // Likert question rendered first
    await screen.findByText('Satisfaction');
    const radio = screen.getByLabelText('1');
    fireEvent.click(radio);

    const submit = screen.getByRole('button', { name: /next/i });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    // After submitting non-QV, we should move to QV module instead of completing
    await waitFor(() => expect(screen.getByTestId('qv-module')).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalledWith(`/survey/${SURVEY_ID}/complete`);
  });
});
