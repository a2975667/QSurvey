import { RootState } from "../../../app/store";
import { IQsOption } from "../../../types/coreTypes";

// Type for the byId object
type OptionsMap = { [key: string]: IQsOption };
type ResponseIdsMap = { [key: string]: string };

// Base selectors - using type assertions to help TypeScript
export const selectOptions = (state: RootState) => state.qsOptions;
export const selectOptionsLoaded = (state: RootState) => state.qsOptions.loaded;

// Position selectors
export const selectPositions = (state: RootState) => state.qsOptions.positions as {[key: string]: string[]};
export const selectCategorySequence = (state: RootState) => state.qsOptions.categorySequence;
export const selectCurrentViewCategories = (state: RootState) => 
  state.qsOptions.categorySequence?.currentViewCategories || [];

// Option data selectors
export const selectOptionsById = (state: RootState) => state.qsOptions.byId as OptionsMap;
export const selectOptionsByCategory = (state: RootState, category: string) => {
  const positions = state.qsOptions.positions as {[key: string]: string[]};
  const byId = state.qsOptions.byId as OptionsMap;
  const optionsInCategory = positions[category] || [];
  return optionsInCategory.map(id => byId[id]);
};

// Metadata selectors
export const selectHoveredOptionId = (state: RootState) => 
  state.qsOptions.metadata.onHoverOptionId;

// Response selectors
export const selectResponseStatus = (state: RootState) => 
  state.qsOptions.responseStatus;
export const selectSurveyResponseId = (state: RootState) => 
  state.qsOptions.responseStatus?.surveyResponseId;
export const selectResponseUUID = (state: RootState) => 
  state.qsOptions.responseStatus?.uuid;
export const selectQuestionResponseIds = (state: RootState) => 
  (state.qsOptions.responseStatus?.questionResponseIds || {}) as ResponseIdsMap;
export const selectResponseError = (state: RootState) => 
  state.qsOptions.responseStatus?.error;
export const selectIsSubmitted = (state: RootState) => 
  state.qsOptions.responseStatus?.submitted;

// Memoized selectors
export const selectOptionById = (state: RootState, optionId: string) => 
  (state.qsOptions.byId as OptionsMap)?.[optionId];

export const selectCategoryOptionIds = (state: RootState, category: string) => {
  const positions = state.qsOptions.positions as {[key: string]: string[]};
  return positions[category] || [];
};

export const selectTotalVotesForCategory = (state: RootState, category: string) => {
  const positions = state.qsOptions.positions as {[key: string]: string[]};
  const byId = state.qsOptions.byId as OptionsMap;
  const optionIds = positions[category] || [];
  return optionIds.reduce((total: number, id: string) => {
    const option = byId?.[id];
    return total + (option ? Math.abs(option.votes) : 0);
  }, 0);
};

export const selectQuestionResponseId = (state: RootState, questionId: string) => {
  const responseIds = state.qsOptions.responseStatus?.questionResponseIds as ResponseIdsMap;
  return responseIds?.[questionId];
};