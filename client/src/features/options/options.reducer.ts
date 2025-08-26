// Import necessary dependencies
import { AnyAction, createReducer } from "@reduxjs/toolkit";
import positionsReducer from "./slices/positions.slice";
import votesReducer from "./slices/votes.slice";
import { metadataReducer, responsesReducer } from "./slices/metadata.slice";
import { fetchSampleOptions } from "./api/options.api";
import { IOptionsState } from "./types/options.types";
import { initQsOptions } from "./slices/positions.slice";

// Default initial state for the combined reducer
const initialState = {
  loaded: false,
  byId: {},
  positions: {},
  categorySequence: {
    hasUndecided: true,
    hasSkip: true,
    userDefinedCategories: [],
    currentViewCategories: [],
  },
  metadata: {
    onHoverOptionId: null,
  },
  responseStatus: {
    submitted: false,
    surveyResponseId: null,
    uuid: undefined,
    questionResponseIds: {},
    error: null,
  }
};

// Main flat reducer that maintains compatibility with the original structure
const optionsReducer = (state: any = initialState, action: AnyAction) => {
  // Handle loading state for fetchSampleOptions
  const actionType = action.type;
  let loaded = state.loaded;
  
  if (actionType === fetchSampleOptions.fulfilled.type) {
    loaded = true;
  } else if (actionType === fetchSampleOptions.pending.type || 
             actionType === fetchSampleOptions.rejected.type) {
    loaded = false;
  } else if (actionType === initQsOptions.type) {
    loaded = true;
  }
  
  // Create the next state by processing different parts with their respective reducers
  const positionsResult = positionsReducer(state, action);
  const votesResult = votesReducer(state, action);
  const metadataResult = metadataReducer(state?.metadata || {}, action);
  const responsesResult = responsesReducer(state?.responseStatus || {}, action);

  // Create a cohesive new state by combining results
  const newState = {
    ...state,
    loaded,
    byId: {
      ...state.byId,
      ...positionsResult?.byId,
      ...votesResult?.byId
    },
    positions: positionsResult?.positions || state.positions,
    categorySequence: positionsResult?.categorySequence || state.categorySequence,
    metadata: {
      onHoverOptionId: metadataResult?.onHoverOptionId || state.metadata?.onHoverOptionId
    },
    responseStatus: {
      submitted: responsesResult?.responseStatus?.submitted || state.responseStatus?.submitted,
      surveyResponseId: responsesResult?.responseStatus?.surveyResponseId || state.responseStatus?.surveyResponseId,
      uuid: responsesResult?.responseStatus?.uuid || state.responseStatus?.uuid,
      questionResponseIds: responsesResult?.responseStatus?.questionResponseIds || state.responseStatus?.questionResponseIds,
      error: responsesResult?.responseStatus?.error || state.responseStatus?.error
    }
  };

  return newState;
};

export default optionsReducer;