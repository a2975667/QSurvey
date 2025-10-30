import { RootState } from '../app/store';
import { QvQuestionState } from '../types/responseTypes';

export const selectUnifiedSlice = (state: RootState) => state.unifiedResponses;
export const selectUnifiedStatus = (state: RootState) => selectUnifiedSlice(state).status;
export const selectUnifiedError = (state: RootState) => selectUnifiedSlice(state).error;

export const selectQvNavigator = (state: RootState) => selectUnifiedSlice(state).qvNavigator;
export const selectActiveQvQuestionId = (state: RootState) => selectQvNavigator(state).activeQuestionId;
export const selectQvCompletionMap = (state: RootState) => selectQvNavigator(state).completed;
export const selectQvIsQuestionCompleted = (state: RootState, questionId: string) =>
  Boolean(selectQvNavigator(state).completed?.[questionId]);
export const selectQvProgress = (state: RootState) => {
  const navigator = selectQvNavigator(state);
  const total = navigator.order.length;
  const completed = navigator.order.reduce(
    (count, questionId) => (navigator.completed?.[questionId] ? count + 1 : count),
    0,
  );
  return { total, completed };
};

export const selectQuestionResponseIds = (state: RootState) => selectUnifiedSlice(state).questionResponseIds;
export const selectQuestionResponseId = (state: RootState, questionId: string) =>
  selectUnifiedSlice(state).questionResponseIds?.[questionId];

export const selectSurveyResponseId = (state: RootState) => selectUnifiedSlice(state).surveyResponseId;
export const selectUnifiedUuid = (state: RootState) => selectUnifiedSlice(state).uuid;

export const selectResponseForQuestion = (state: RootState, questionId: string) =>
  selectUnifiedSlice(state).byQuestionId?.[questionId];

export const selectLikertSelection = (state: RootState, questionId: string) => {
  const response = selectResponseForQuestion(state, questionId);
  return response?.type === 'likert' ? response.selection : undefined;
};

export const selectTextAnswer = (state: RootState, questionId: string) => {
  const response = selectResponseForQuestion(state, questionId);
  return response?.type === 'text' ? response.text : '';
};

export const selectQvQuestion = (state: RootState, questionId: string): QvQuestionState | undefined => {
  const response = selectResponseForQuestion(state, questionId);
  return response?.type === 'qv' ? (response as QvQuestionState) : undefined;
};

export const selectQvGroupOptionIds = (state: RootState, questionId: string, group: string) =>
  selectQvQuestion(state, questionId)?.positionsByGroup?.[group] ?? [];

export const selectQvOptionById = (
  state: RootState,
  questionId: string,
  optionId: string,
) => selectQvQuestion(state, questionId)?.options?.[optionId];

export const selectQvTotalAbsoluteVotes = (state: RootState, questionId: string) => {
  const qv = selectQvQuestion(state, questionId);
  if (!qv) return 0;
  return Object.values(qv.options).reduce((sum, option) => sum + Math.abs(option.votes), 0);
};

export const selectQvTotalQuadraticCost = (state: RootState, questionId: string) => {
  const qv = selectQvQuestion(state, questionId);
  if (!qv) return 0;
  return Object.values(qv.options).reduce((sum, option) => sum + option.votes * option.votes, 0);
};

export type QvViewMode = 'organize' | 'vote';

export const selectQvViewCategories = (
  state: RootState,
  questionId: string,
  mode: QvViewMode,
) => {
  const qv = selectQvQuestion(state, questionId);
  if (!qv) return [] as string[];

  const { categoriesOrder, bins } = qv;
  if (!bins.hasSkip) return categoriesOrder;

  // Skip placement mimics legacy behaviour: first in organize, last in vote
  const filtered = categoriesOrder.filter((category) => category !== 'Skip');
  if (mode === 'organize') {
    return ['Skip', ...filtered];
  }
  return [...filtered, 'Skip'];
};
