import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import SurveyView from '../SurveyView';
import metadataSlice, { fetchMetaData } from '../../../features/metadataSlice';
import questionsSlice, { fetchSampleQuestions } from '../../../features/questionsSlice';
import surveysSlice, { fetchSurveyData } from '../../../features/surveysSlice';
import unifiedResponsesReducer, { setLikertSelection, setTextAnswer } from '../../../features/unifiedResponsesSlice';
import authReducer from '../../../features/authSlice';
import { completeSurveySubmission } from '../../../components/QsNavBar/submission';

const SURVEY_ID = 'survey-nonqv';
const backendQuestions = [
  {
    _id: 'likert-1',
    question: 'Satisfaction',
    description: 'Rate your satisfaction',
    type: 'likert',
    position: 0,
    scale: ['1', '2', '3'],
    minLabel: 'Low',
    maxLabel: 'High',
  },
  {
    _id: 'text-1',
    question: 'Comment',
    description: 'Tell us more',
    type: 'text',
    position: 1,
    multiline: true,
  },
];

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

jest.mock('../../../components/QsNavBar/submission', () => {
  const completeSurveySubmission = jest.fn(async () => {});
  return {
    __esModule: true,
    completeSurveySubmission,
    submitQvQuestion: jest.fn(),
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
    type: 'questions/fetchMetaData/fulfilled',
    payload: fulfilledPayload,
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

const buildStore = () =>
  configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
      auth: authReducer.reducer,
    },
  });

describe('Non-QV submission completes using result ids', () => {
  it('calls completion with ids returned from batch submission', async () => {
    const fetchMock = jest.fn(async (url: any) => {
      if (typeof url === 'string' && url.includes('/survey/responses/batch')) {
        return {
          ok: true,
          json: async () => ({
            surveyResponse: { _id: 'resp-123', uuid: 'uuid-123' },
            questionResponses: [],
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
    (global as any).fetch = fetchMock;

    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);
    store.dispatch(setLikertSelection({ questionId: 'likert-1', selection: '3' }));
    store.dispatch(setTextAnswer({ questionId: 'text-1', text: 'hello' }));

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    const submitButton = await screen.findByRole('button', { name: /submit responses/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(completeSurveySubmission).toHaveBeenCalled();
    });

    const payload = (completeSurveySubmission as jest.Mock).mock.calls[0][0];
    expect(payload.surveyResponseId).toBe('resp-123');
    expect(payload.uuid).toBe('uuid-123');
    expect(mockNavigate).toHaveBeenCalledWith(`/survey/${SURVEY_ID}/complete`);
  });
});
