// Re-export all actions from the slices for ease of use
import {
  initQsOptions,
  createCategories,
  updateOptionPosition,
  updateOptionGroup,
  setPositionGroups,
  calPosition,
  mergeOptionGroups,
  reorderOptions,
  regroupAndOrderOptions,
} from "./slices/positions.slice";

import {
  updateOptionVotes,
  clearAllOptionVotesByOptionKeys,
  addOneVoteToAllOptionsByOptionKeys
} from "./slices/votes.slice";

import {
  setOnHoverOptionID,
  clearOnHoverOptionID,
  clearResponseStatus
} from "./slices/metadata.slice";

import {
  fetchSampleOptions,
  fetchSurveyResponseByUUID,
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse
} from "./api/options.api";

export {
  // Positions actions
  initQsOptions,
  createCategories,
  updateOptionPosition,
  updateOptionGroup,
  setPositionGroups,
  calPosition,
  mergeOptionGroups,
  reorderOptions,
  regroupAndOrderOptions,
  
  // Votes actions
  updateOptionVotes,
  clearAllOptionVotesByOptionKeys,
  addOneVoteToAllOptionsByOptionKeys,
  
  // Metadata actions
  setOnHoverOptionID,
  clearOnHoverOptionID,
  clearResponseStatus,
  
  // API actions
  fetchSampleOptions,
  fetchSurveyResponseByUUID,
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse
};