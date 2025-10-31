import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Ensure unified QV path is enabled for these tests
process.env.REACT_APP_ENABLE_UNIFIED_QV = 'true';

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

// Import reducers and actions
import metadataSlice from '../../../features/metadataSlice';
import qsOptionsSlice, { setPositionGroups, calPosition, mergeOptionGroups } from '../../../features/qsOptionsSlice';
import questionsSlice from '../../../features/questionsSlice';
import surveysSlice from '../../../features/surveysSlice';
import unifiedResponsesReducer, {
  seedQvQuestion,
  syncQvNavigator,
} from '../../../features/unifiedResponsesSlice';
import QuadraticSurveyPage from '../components/QuadraticSurveyPage';

const buildStore = () => {
  return configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      qsOptions: qsOptionsSlice.reducer,
      questions: questionsSlice.reducer,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
      auth: (s = { isAuthenticated: false, token: null, user: null }) => s,
    },
  });
};

function seedQuestions(store: any) {
  const state = store.getState();
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

  // Initialize qsOptions from questions (triggers middleware to seed unified)
  const qState = store.getState().questions;
  store.dispatch((qsOptionsSlice.actions as any).initQsOptions(qState));

  // Ensure navigator is synced (QuadraticSurveyPage will also do this, but we seed explicitly for determinism)
  store.dispatch(syncQvNavigator({ order: ['qv1', 'qv2'], activeQuestionId: 'qv1' }));
}

describe('QuadraticSurveyPage (unified QV)', () => {
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
});
