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

const SURVEY_ID = 'survey-approval';
const mockNavigate = jest.fn();
const mockSubmitApprovalQuestion = jest.fn(async () => ({
  surveyResponseId: 'resp-1',
  uuid: 'uuid-1',
  questionResponseId: 'qr-1',
}));
const mockCompleteSurveySubmission = jest.fn(async () => {});

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

jest.mock('../../../components/QsNavBar/submission', () => ({
  __esModule: true,
  submitApprovalQuestion: (...args: any[]) => mockSubmitApprovalQuestion(...args),
  submitQvQuestion: jest.fn(async () => ({ surveyResponseId: 'resp-2', uuid: 'uuid-2' })),
  completeSurveySubmission: (...args: any[]) => mockCompleteSurveySubmission(...args),
}));

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

jest.mock('../../../features/questionsSlice', () => {
  const actual = jest.requireActual('../../../features/questionsSlice');
  const payload = [
    {
      _id: 'approval-1',
      question: 'Approval prompt',
      description: 'Pick any options',
      type: 'approval',
      maxApprovals: 1,
      position: 0,
      options: [
        { optionId: 'opt-a', optionName: 'Alpha', description: 'A' },
        { optionId: 'opt-b', optionName: 'Beta', description: 'B' },
      ],
    },
    {
      _id: 'qv-1',
      question: 'QV question',
      description: '',
      type: 'qv',
      position: 1,
      options: [
        { optionId: 'a', optionName: 'A', description: '' },
        { optionId: 'b', optionName: 'B', description: '' },
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

describe('Approval survey flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows modal when submitting with zero approvals', async () => {
    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    await screen.findByText('Approval prompt');
    const nextButton = screen.getByRole('button', { name: /next module/i });
    fireEvent.click(nextButton);

    expect(await screen.findByTestId('approval-zero-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(mockSubmitApprovalQuestion).toHaveBeenCalledTimes(1));
    const callArg = mockSubmitApprovalQuestion.mock.calls[0][0];
    expect(callArg.approvalState.approvals).toEqual([]);

    await waitFor(() => expect(screen.getByTestId('qv-module')).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalledWith(`/survey/${SURVEY_ID}/complete`);
  });

  it('submits selected approvals without warning', async () => {
    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    await screen.findByText('Approval prompt');
    const optionCard = screen.getByTestId('approval-card-opt-a');
    fireEvent.click(optionCard);

    const nextButton = screen.getByRole('button', { name: /next module/i });
    fireEvent.click(nextButton);

    await waitFor(() => expect(mockSubmitApprovalQuestion).toHaveBeenCalledTimes(1));
    const callArg = mockSubmitApprovalQuestion.mock.calls[0][0];
    expect(callArg.approvalState.approvals).toEqual(['opt-a']);
    expect(screen.queryByTestId('approval-zero-modal')).not.toBeInTheDocument();
  });

  it('blocks selecting above the configured approval cap', async () => {
    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    await screen.findByText('Approval prompt');
    expect(screen.getByText('Selected 0 of 1 approvals')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('approval-card-opt-a'));
    expect(screen.getByText('Selected 1 of 1 approvals')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('approval-card-opt-b'));
    expect(
      screen.getByText('You can approve up to 1 option for this question.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next module/i }));
    await waitFor(() => expect(mockSubmitApprovalQuestion).toHaveBeenCalledTimes(1));
    const callArg = mockSubmitApprovalQuestion.mock.calls[0][0];
    expect(callArg.approvalState.approvals).toEqual(['opt-a']);
  });

  it('allows selecting and submitting the last approval option', async () => {
    const store = buildStore();
    store.dispatch(fetchMetaData(SURVEY_ID) as any);
    store.dispatch(fetchSampleQuestions(SURVEY_ID) as any);
    store.dispatch(fetchSurveyData(SURVEY_ID) as any);

    render(
      <Provider store={store}>
        <SurveyView />
      </Provider>,
    );

    await screen.findByText('Approval prompt');
    fireEvent.click(screen.getByTestId('approval-card-opt-b'));

    fireEvent.click(screen.getByRole('button', { name: /next module/i }));

    await waitFor(() => expect(mockSubmitApprovalQuestion).toHaveBeenCalledTimes(1));
    const callArg = mockSubmitApprovalQuestion.mock.calls[0][0];
    expect(callArg.approvalState.approvals).toEqual(['opt-b']);
    expect(screen.queryByTestId('approval-zero-modal')).not.toBeInTheDocument();
  });
});
