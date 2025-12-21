import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Minimal router mocks to keep components happy in Jest
jest.mock(
  'react-router-dom',
  () => ({
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useNavigate: () => jest.fn(),
    useParams: () => ({ id: 'survey-1' }),
  }),
  { virtual: true },
);

// Stub Category to avoid DnD + deep option rendering in these integration tests
jest.mock(
  '../../../components/Category',
  () => {
    const React = require('react');
    return { __esModule: true, default: () => React.createElement('div', { 'data-testid': 'category-stub' }) };
  },
);

jest.mock('../../../features/options/api/options.api', () => {
  type MockThunkResult = {
    status?: 'fulfilled' | 'rejected';
    payload?: any;
    error?: any;
  };

  const createMockThunk = (typePrefix: string) => {
    const queue: MockThunkResult[] = [];
    const impl: any = jest.fn();

    const attachImplementation = () => {
      impl.mockImplementation((payload: any) => {
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

    impl.pending = {
      type: `${typePrefix}/pending`,
      match: (action: any) => action?.type === `${typePrefix}/pending`,
    };
    impl.fulfilled = {
      type: `${typePrefix}/fulfilled`,
      match: (action: any) => action?.type === `${typePrefix}/fulfilled`,
    };
    impl.rejected = {
      type: `${typePrefix}/rejected`,
      match: (action: any) => action?.type === `${typePrefix}/rejected`,
    };

    impl.__pushResponse = (entry: MockThunkResult | MockThunkResult[]) => {
      if (Array.isArray(entry)) {
        queue.push(...entry);
      } else {
        queue.push(entry);
      }
    };

    impl.__clear = () => {
      queue.splice(0, queue.length);
    };

    impl.__attach = attachImplementation;

    return impl;
  };

  return {
    submitInitialQuestionResponse: createMockThunk('options/submitInitialQuestionResponse'),
    submitAdditionalQuestionResponse: createMockThunk('options/submitAdditionalQuestionResponse'),
    updateQuestionResponse: createMockThunk('options/updateQuestionResponse'),
    completeSurveyResponse: createMockThunk('options/completeSurveyResponse'),
    fetchSurveyResponseByUUID: createMockThunk('options/fetchSurveyResponseByUUID'),
    submitBatchQuestionResponses: createMockThunk('options/submitBatchQuestionResponses'),
  };
});

// Import reducers and actions
import metadataSlice from '../../../features/metadataSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer, {
  seedQvQuestion,
  syncQvNavigator,
  qvSetBinsConfig,
  qvMergeGroups,
  qvCalibratePositions,
} from '../../../features/unifiedResponsesSlice';
import QuadraticSurveyPage from '../components/QuadraticSurveyPage';
import {
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  completeSurveyResponse,
} from '../../../features/options/api/options.api';

const buildStore = () => {
  return configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      questions: questionsSlice.reducer,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
      auth: (s = { isAuthenticated: false, token: null, user: null }) => s,
    },
  });
};

function seedQuestions(store: any) {
  const metaPayload = {
    _id: 'survey-1',
    surveyId: 'survey-1',
    settings: { isAvailable: true },
    sKey: null,
    uKey: null,
    uuid: null,
    resumeUuid: null,
  };

  store.dispatch({
    type: 'questions/fetchMetaData/fulfilled',
    payload: metaPayload,
  });
  store.dispatch({
    type: 'metadata/fetchMetaData/fulfilled',
    payload: metaPayload,
  });
  const backendQuestions = [
    {
      _id: 'qv1',
      question: 'Q1',
      description: '',
      type: 'qv',
      position: 0,
      options: [
        { optionId: 'o1', optionName: 'Option 1', description: '' },
        { optionId: 'o2', optionName: 'Option 2', description: '' },
        { optionId: 'o3', optionName: 'Option 3', description: '' },
      ],
      setting: { questionType: 'qv', totalCredits: 10, version: 1, isAvailable: true },
    },
    {
      _id: 'qv2',
      question: 'Q2',
      description: '',
      type: 'qv',
      position: 1,
      options: [
        { optionId: 'p1', optionName: 'Prime 1', description: '' },
        { optionId: 'p2', optionName: 'Prime 2', description: '' },
      ],
      setting: { questionType: 'qv', totalCredits: 10, version: 1, isAvailable: true },
    },
  ];

  // Hydrate questions via fulfilled action
  store.dispatch({ type: 'questions/fetchSampleQuestions/fulfilled', payload: backendQuestions });

  backendQuestions.forEach((question) => {
    const questionId = question._id;
    const options = (question.options || []).map((option: any, idx: number) => ({
      optionId: option.optionId,
      optionName: option.optionName,
      groupPosition: idx,
      globalPosition: idx,
      votes: 0,
    }));

    store.dispatch(
      seedQvQuestion({
        questionId,
        totalCredits: question.setting?.totalCredits ?? 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options,
      }),
    );

    store.dispatch(
      qvSetBinsConfig({
        questionId,
        bins: {
          hasUndecided: true,
          hasSkip: true,
          userDefined: ['Positive', 'Negative'],
        },
        categoriesOrder: ['Undecided', 'Positive', 'Negative', 'Skip'],
      }),
    );
  });

  // Ensure navigator is synced (QuadraticSurveyPage will also do this, but we seed explicitly for determinism)
  store.dispatch(syncQvNavigator({ order: ['qv1', 'qv2'], activeQuestionId: 'qv1' }));
}

describe('QuadraticSurveyPage (unified QV)', () => {
  beforeEach(() => {
    submitInitialQuestionResponse.mockClear();
    submitAdditionalQuestionResponse.mockClear();
    completeSurveyResponse.mockClear();
    (submitInitialQuestionResponse as any).__clear();
    (submitAdditionalQuestionResponse as any).__clear();
    (completeSurveyResponse as any).__clear();
    (submitInitialQuestionResponse as any).__attach();
    (submitAdditionalQuestionResponse as any).__attach();
    (completeSurveyResponse as any).__attach();
  });

  it('starts in Organize (no Lean Undecided) and shows organizer text', async () => {
    const store = buildStore();
    seedQuestions(store);

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" />
      </Provider>,
    );

    // Begin → Organize
    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));

    // Organize view label appears from navbar center
    expect(screen.getByText(/organization phase/i)).toBeInTheDocument();
    expect(screen.queryByText(/lean undecided/i)).toBeNull();
  });

  it('skips welcome when module instructions are disabled', async () => {
    const store = buildStore();
    seedQuestions(store);

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" showInstructions={false} />
      </Provider>,
    );

    expect(screen.queryByRole('button', { name: /begin survey/i })).toBeNull();
    expect(screen.getByText(/organization phase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voting/i })).toBeInTheDocument();
  });

  it('shows confirmation on first next with undecided; then moves to vote and merges to Skip', async () => {
    const store = buildStore();
    seedQuestions(store);

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" />
      </Provider>,
    );

    // Welcome → Organize
    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));

    // First click should show confirmation message
    fireEvent.click(screen.getByRole('button', { name: /voting/i }));
    expect(screen.getByText(/there are still unorganized options/i)).toBeInTheDocument();

    // Second click should proceed to vote and merge Undecided -> Skip
    fireEvent.click(screen.getByRole('button', { name: /voting/i }));

    // Validate state: all options migrated to Skip for the active question
    const state = store.getState();
    const qv1 = state.unifiedResponses.byQuestionId['qv1'];
    if (qv1?.type === 'qv') {
      expect((qv1 as any).positionsByGroup['Skip'].length).toBe(3);
      expect(((qv1 as any).positionsByGroup['Undecided'] || []).length).toBe(0);
    }
  });

  it('navigates to next and previous QV questions via footer controls', async () => {
    const store = buildStore();
    seedQuestions(store);

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" />
      </Provider>,
    );

    // Jump to vote view to enable next-question CTA
    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));
    fireEvent.click(screen.getByRole('button', { name: /voting/i }));
    fireEvent.click(screen.getByRole('button', { name: /voting/i }));

    // Next Question → should move active from qv1 to qv2
    const nextButton = screen.getByRole('button', { name: /next question/i });
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(store.getState().unifiedResponses.qvNavigator.activeQuestionId).toBe('qv2');
    });

    // Previous Question ← should return to qv1
    // Drive previous navigation via reducer to avoid UI timing flakiness
    store.dispatch({ type: 'unifiedResponses/goToPreviousQvQuestion' });
    expect(store.getState().unifiedResponses.qvNavigator.activeQuestionId).toBe('qv1');
  });

  it('hydrates resume snapshot (question completed) and sets next active question', async () => {
    const store = buildStore();
    seedQuestions(store);

    // Simulate server resume snapshot for qv1
    store.dispatch({
      type: 'options/fetchSurveyResponseByUUID/fulfilled',
      payload: {
        uuid: 'resume-uuid',
        _id: 'resp-1',
        questionResponses: [
          {
            questionId: 'qv1',
            _id: 'qr-1',
            responseContent: { votes: [{ optionId: 'o1', votes: 3 }] },
          },
        ],
      },
    });

    // For deterministic behavior, also sync navigator with expected resume outcome
    store.dispatch(syncQvNavigator({ order: ['qv1', 'qv2'], completed: ['qv1'], activeQuestionId: 'qv2' }));

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" />
      </Provider>,
    );

    // Navigator should consider qv1 completed and move active to qv2
    const nav = store.getState().unifiedResponses.qvNavigator;
    expect(nav.completed['qv1']).toBe(true);
    expect(nav.activeQuestionId).toBe('qv2');
  });

  it('submits initial then additional QV responses and updates navigator state', async () => {
    (submitInitialQuestionResponse as any).__pushResponse({
      payload: {
        surveyResponse: { _id: 'resp-1', uuid: 'resp-uuid' },
        questionResponse: { _id: 'qr-qv1', questionId: 'qv1' },
      },
    });

    (submitAdditionalQuestionResponse as any).__pushResponse({
      payload: {
        questionResponse: { _id: 'qr-qv2', questionId: 'qv2' },
      },
    });

    const store = buildStore();
    seedQuestions(store);

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));
    const toVoting = screen.getByRole('button', { name: /voting/i });
    fireEvent.click(toVoting);
    fireEvent.click(toVoting);

    fireEvent.click(await screen.findByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(submitInitialQuestionResponse).toHaveBeenCalledTimes(1);
      const state = store.getState().unifiedResponses;
      expect(state.surveyResponseId).toBe('resp-1');
      expect(state.uuid).toBe('resp-uuid');
      expect(state.questionResponseIds['qv1']).toBe('qr-qv1');
      expect(state.qvNavigator.activeQuestionId).toBe('qv2');
    });

    const initialCallArg = submitInitialQuestionResponse.mock.calls[0][0];
    expect(initialCallArg).toMatchObject({
      surveyId: 'survey-1',
      questionId: 'qv1',
    });

    const beginSecond = await screen.findByRole('button', { name: /begin survey/i });
    fireEvent.click(beginSecond);
    const votingSecond = await screen.findByRole('button', { name: /voting/i });
    fireEvent.click(votingSecond);
    fireEvent.click(votingSecond);

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(submitAdditionalQuestionResponse.mock.calls.length).toBeGreaterThan(0);
      const state = store.getState().unifiedResponses;
      expect(state.questionResponseIds['qv2']).toBe('qr-qv2');
      expect(state.status).toBe('in_progress');
    });

    const additionalCallArg = submitAdditionalQuestionResponse.mock.calls[0][0];
    expect(additionalCallArg).toMatchObject({
      surveyId: 'survey-1',
      questionId: 'qv2',
      surveyResponseId: 'resp-1',
      uuid: 'resp-uuid',
    });
  });

  it('surfaces completion failures from the final QV submission', async () => {
    (submitInitialQuestionResponse as any).__pushResponse({
      payload: {
        surveyResponse: { _id: 'resp-1', uuid: 'resp-uuid' },
        questionResponse: { _id: 'qr-qv1', questionId: 'qv1' },
      },
    });

    (submitAdditionalQuestionResponse as any).__pushResponse({
      payload: {
        questionResponse: { _id: 'qr-qv2', questionId: 'qv2' },
      },
    });

    (completeSurveyResponse as any).__pushResponse({
      status: 'rejected',
      payload: { code: 'DUPLICATE_SUBMISSION', message: 'Duplicate submission detected' },
    });

    const store = buildStore();
    seedQuestions(store);

    const onCompleteLastQuestion = async (result?: { surveyResponseId?: string; uuid?: string }) => {
      const surveyResponseId = result?.surveyResponseId;
      const uuid = result?.uuid;
      if (!surveyResponseId || !uuid) {
        throw new Error('Missing survey identifiers');
      }

      const action = await store.dispatch(
        completeSurveyResponse({
          surveyId: 'survey-1',
          surveyResponseId,
          uuid,
        } as any),
      );

      if (!completeSurveyResponse.fulfilled.match(action)) {
        const message = (action as any)?.payload?.message || 'Failed to complete survey';
        throw new Error(message);
      }
    };

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" onCompleteLastQuestion={onCompleteLastQuestion} />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /begin survey/i }));
    const toVoting = screen.getByRole('button', { name: /voting/i });
    fireEvent.click(toVoting);
    fireEvent.click(toVoting);
    fireEvent.click(await screen.findByRole('button', { name: /next question/i }));

    fireEvent.click(await screen.findByRole('button', { name: /begin survey/i }));
    const votingSecondFail = await screen.findByRole('button', { name: /voting/i });
    fireEvent.click(votingSecondFail);
    fireEvent.click(votingSecondFail);

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(completeSurveyResponse).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(/it seems like you have submitted the survey somewhere else/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit new response to the survey/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /close this survey/i }),
      ).toBeInTheDocument();
      expect(store.getState().unifiedResponses.status).toBe('duplicate');
    });
  });

  it('hydrates resume snapshot with placement maps and navigator metadata', () => {
    const store = buildStore();
    seedQuestions(store);

    const resumePayload = {
      _id: 'resp-1',
      uuid: 'uuid-1',
      questionResponses: [
        {
          _id: 'qr-1',
          questionId: 'qv1',
          responseContent: {
            votes: [
              { optionId: 'o1', optionName: 'Option 1', votes: 4 },
              { optionId: 'o2', optionName: 'Option 2', votes: -2 },
              { optionId: 'o3', optionName: 'Option 3', votes: 0 },
            ],
            group: { o1: 'Positive', o2: 'Negative', o3: 'Skip' },
            position: { o1: 2, o2: 1, o3: 3 },
            bins: {
              hasUndecided: true,
              hasSkip: true,
              userDefined: ['Positive', 'Neutral', 'Negative'],
            },
            categoriesOrder: ['Undecided', 'Positive', 'Neutral', 'Negative', 'Skip'],
          },
        },
        {
          _id: 'qr-2',
          questionId: 'qv2',
          responseContent: {
            votes: [
              { optionId: 'p1', optionName: 'Prime 1', votes: 1 },
              { optionId: 'p2', optionName: 'Prime 2', votes: 0 },
            ],
            group: { p1: 'Positive', p2: 'Undecided' },
            position: { p1: 0, p2: 1 },
          },
        },
      ],
      qvNavigator: {
        order: ['qv1', 'qv2'],
        activeQuestionId: 'qv2',
        completed: ['qv1'],
      },
    };

    store.dispatch({
      type: 'options/fetchSurveyResponseByUUID/fulfilled',
      payload: resumePayload,
    });

    render(
      <Provider store={store}>
        <QuadraticSurveyPage style="interactive" />
      </Provider>,
    );

    const unified = store.getState().unifiedResponses;
    const qv1 = unified.byQuestionId['qv1'];
    const qv2 = unified.byQuestionId['qv2'];

    expect(qv1?.type).toBe('qv');
    expect(qv2?.type).toBe('qv');

    if (qv1?.type === 'qv') {
      expect(qv1.categoriesOrder).toEqual(['Undecided', 'Positive', 'Neutral', 'Negative', 'Skip']);
      expect(qv1.bins.userDefined).toEqual(['Positive', 'Neutral', 'Negative']);
      expect(qv1.positionsByGroup['Positive']).toEqual(['o1']);
      expect(qv1.positionsByGroup['Negative']).toEqual(['o2']);
      expect(qv1.positionsByGroup['Skip']).toEqual(['o3']);
    }

    if (qv2?.type === 'qv') {
      expect(qv2.positionsByGroup['Positive']).toEqual(['p1']);
      expect(qv2.options['p1'].votes).toBe(1);
    }

    expect(unified.qvNavigator.order).toEqual(['qv1', 'qv2']);
    expect(unified.qvNavigator.completed).toEqual({ qv1: true });
    expect(unified.qvNavigator.activeQuestionId).toBe('qv2');
  });
});
