import {
  selectLikertSelection,
  selectActiveQvQuestionId,
  selectQvGroupOptionIds,
  selectQvOptionById,
  selectQvProgress,
  selectQvTotalAbsoluteVotes,
  selectQvTotalQuadraticCost,
  selectQvNavigator,
  selectQvViewCategories,
  selectQuestionResponseId,
  selectSurveyResponseId,
  selectUnifiedUuid,
} from '../unifiedResponsesSelectors';
import reducer, {
  recordQuestionResponseId,
  seedQvQuestion,
  setLikertSelection,
  startSurveySession,
  syncQvNavigator,
} from '../unifiedResponsesSlice';
import { RootState } from '../../app/store';

const QUESTION_ID = 'question-selector';

function buildState(): RootState {
  let unified = reducer(undefined, { type: '@@INIT' });
  unified = reducer(
    unified,
    seedQvQuestion({
      questionId: QUESTION_ID,
      totalCredits: 9,
      categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
      options: [
        { optionId: 'a', group: 'Undecided', votes: 1 },
        { optionId: 'b', group: 'Positive', votes: 3 },
        { optionId: 'c', group: 'Negative', votes: -2 },
      ],
    }),
  );

  unified = reducer(
    unified,
    startSurveySession({ surveyId: 'survey', surveyResponseId: 'resp', uuid: 'uuid' }),
  );

  unified = reducer(
    unified,
    recordQuestionResponseId({ questionId: QUESTION_ID, questionResponseId: 'qr-1' }),
  );

  unified = reducer(unified, syncQvNavigator({ order: [QUESTION_ID] }));

  unified = reducer(unified, setLikertSelection({ questionId: 'likert', selection: '4' }));

  return {
    metadata: undefined as any,
    qsOptions: undefined as any,
    questions: undefined as any,
    auth: undefined as any,
    surveys: undefined as any,
    unifiedResponses: unified,
  } as unknown as RootState;
}

describe('unifiedResponsesSelectors', () => {
  const state = buildState();

  it('returns likert selection', () => {
    expect(selectLikertSelection(state, 'likert')).toBe('4');
  });

  it('returns per-group option ids', () => {
    const groupIds = selectQvGroupOptionIds(state, QUESTION_ID, 'Positive');
    expect(groupIds).toContain('b');
  });

  it('returns option details by id', () => {
    const option = selectQvOptionById(state, QUESTION_ID, 'c');
    expect(option?.votes).toBe(-2);
  });

  it('computes total absolute votes', () => {
    expect(selectQvTotalAbsoluteVotes(state, QUESTION_ID)).toBe(1 + 3 + 2);
  });

  it('computes quadratic cost', () => {
    expect(selectQvTotalQuadraticCost(state, QUESTION_ID)).toBe(1 * 1 + 3 * 3 + (-2) * (-2));
  });

  it('derives organize-mode view categories with skip first', () => {
    const organizeOrder = selectQvViewCategories(state, QUESTION_ID, 'organize');
    expect(organizeOrder[0]).toBe('Skip');
  });

  it('derives vote-mode view categories with skip last', () => {
    const voteOrder = selectQvViewCategories(state, QUESTION_ID, 'vote');
    expect(voteOrder[voteOrder.length - 1]).toBe('Skip');
  });

  it('returns response identifiers', () => {
    expect(selectQuestionResponseId(state, QUESTION_ID)).toBe('qr-1');
    expect(selectSurveyResponseId(state)).toBe('resp');
    expect(selectUnifiedUuid(state)).toBe('uuid');
  });

  it('returns QV navigator details', () => {
    const navigator = selectQvNavigator(state);
    expect(navigator.order).toEqual([QUESTION_ID]);
    expect(selectActiveQvQuestionId(state)).toBe(QUESTION_ID);
  });

  it('computes QV progress summary', () => {
    const progress = selectQvProgress(state);
    expect(progress.total).toBe(1);
    expect(progress.completed).toBe(0);
  });
});
