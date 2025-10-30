import { configureStore } from '@reduxjs/toolkit';
import qsOptionsSlice, {
  initQsOptions,
  mergeOptionGroups,
  setPositionGroups,
  updateOptionPosition,
  updateOptionVotes,
} from '../qsOptionsSlice';
import questionsSlice from '../questionsSlice';
import metadataSlice from '../metadataSlice';
import surveysSlice from '../surveysSlice';
import unifiedResponsesReducer, { qvCalibratePositions } from '../unifiedResponsesSlice';
import unifiedResponsesMiddleware from '../unifiedResponsesMiddleware';

const buildStore = () => {
  const metadataState = metadataSlice.reducer(undefined, { type: '@@INIT' });
  const surveysState = surveysSlice.reducer(undefined, { type: '@@INIT' });
  const questionsState = {
    loaded: true,
    byId: {
      qv: {
        questionId: 'qv',
        type: 'qv',
        question: 'Allocate credits',
        description: '',
        status: 'Incomplete',
        position: 0,
        totalCredits: 10,
      },
    },
  };

  const qsOptionsState = qsOptionsSlice.reducer(undefined, { type: '@@INIT' });

  return configureStore({
    reducer: {
      metadata: metadataSlice.reducer,
      qsOptions: qsOptionsSlice.reducer,
      questions: questionsSlice.reducer,
      auth: (state = { isAuthenticated: false }) => state,
      surveys: surveysSlice.reducer,
      unifiedResponses: unifiedResponsesReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(unifiedResponsesMiddleware),
    preloadedState: {
      metadata: metadataState,
      qsOptions: qsOptionsState,
      questions: questionsState,
      auth: { isAuthenticated: false },
      surveys: surveysState,
      unifiedResponses: unifiedResponsesReducer(undefined, { type: '@@INIT' }),
    },
  });
};

describe('unifiedResponsesMiddleware', () => {
  it('seeds unified QV state when options are initialised', () => {
    const store = buildStore();
    store.dispatch(
      initQsOptions({
        byId: {
          qv: {
            questionId: 'qv',
            rawOptions: [
              { optionId: 'a', optionName: 'Alpha', description: 'Alpha option' },
              { optionId: 'b', optionName: 'Beta', description: 'Beta option' },
            ],
          },
        },
      }),
    );

    const unifiedState = store.getState().unifiedResponses;
    const qvState = unifiedState.byQuestionId['qv'];
    expect(qvState).toBeDefined();
    if (qvState?.type !== 'qv') {
      throw new Error('Expected qv state');
    }
    expect(Object.keys(qvState.options)).toHaveLength(2);
    expect(qvState.options['a'].optionName).toBe('Alpha');
  });

  it('mirrors category updates into unified state', () => {
    const store = buildStore();
    store.dispatch(
      initQsOptions({
        byId: {
          qv: {
            questionId: 'qv',
            rawOptions: [
              { optionId: 'a', optionName: 'Alpha' },
            ],
          },
        },
      }),
    );

    store.dispatch(
      setPositionGroups({
        userDefinedCategories: ['Positive', 'Negative'],
        categoryiesHasSkip: true,
        page: 'organize',
      }),
    );

    const qvState = store.getState().unifiedResponses.byQuestionId['qv'];
    if (!qvState || qvState.type !== 'qv') throw new Error('Missing qv state');
    expect(qvState.categoriesOrder.includes('Positive')).toBeTruthy();
  });

  it('mirrors option moves and vote updates', () => {
    const store = buildStore();
    store.dispatch(
      initQsOptions({
        byId: {
          qv: {
            questionId: 'qv',
            rawOptions: [
              { optionId: 'a', optionName: 'Alpha' },
              { optionId: 'b', optionName: 'Beta' },
            ],
          },
        },
      }),
    );

    store.dispatch(
      setPositionGroups({
        userDefinedCategories: ['Positive', 'Negative'],
        categoryiesHasSkip: true,
        page: 'organize',
      }),
    );

    store.dispatch(
      updateOptionPosition({
        optionId: 'a',
        originalCategory: 'Undecided',
        newCategory: 'Positive',
        newPosition: 0,
      }),
    );

    store.dispatch(updateOptionVotes({ optionId: 'a', newVote: 3 }));

    const qvState = store.getState().unifiedResponses.byQuestionId['qv'];
    if (!qvState || qvState.type !== 'qv') throw new Error('Missing qv state');
    expect(qvState.options['a'].group).toBe('Positive');
    expect(qvState.options['a'].votes).toBe(3);
  });

  it('mirrors merge operations and recalibrates positions', () => {
    const store = buildStore();
    store.dispatch(
      initQsOptions({
        byId: {
          qv: {
            questionId: 'qv',
            rawOptions: [
              { optionId: 'a', optionName: 'Alpha' },
              { optionId: 'b', optionName: 'Beta' },
            ],
          },
        },
      }),
    );

    store.dispatch(
      setPositionGroups({
        userDefinedCategories: ['Positive', 'Negative'],
        categoryiesHasSkip: true,
        page: 'organize',
      }),
    );

    store.dispatch(
      mergeOptionGroups({ source: 'Undecided', target: 'Skip' }),
    );
    store.dispatch(qvCalibratePositions({ questionId: 'qv' }));

    const qvState = store.getState().unifiedResponses.byQuestionId['qv'];
    if (!qvState || qvState.type !== 'qv') throw new Error('Missing qv state');
    expect(qvState.positionsByGroup['Undecided']).toHaveLength(0);
  });
});
