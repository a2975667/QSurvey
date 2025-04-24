import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IMetadataState, IResponsesState } from "../types/options.types";
import { 
  completeSurveyResponse, 
  fetchSurveyResponseByUUID, 
  submitAdditionalQuestionResponse, 
  submitInitialQuestionResponse, 
  updateQuestionResponse 
} from "../api/options.api";

// Metadata slice
const metadataInitialState: IMetadataState = {
  onHoverOptionId: null,
};

const metadataSlice = createSlice({
  name: "options/metadata",
  initialState: metadataInitialState,
  reducers: {
    /**
     * Set the ID of the option being hovered over
     */
    setOnHoverOptionID: (state, action: PayloadAction<string | null>) => {
      state.onHoverOptionId = action.payload;
    },
    
    /**
     * Clear the hover option ID
     */
    clearOnHoverOptionID: (state) => {
      state.onHoverOptionId = null;
    }
  }
});

// Responses slice
const responsesInitialState: IResponsesState = {
  responseStatus: {
    submitted: false,
    surveyResponseId: null,
    uuid: undefined,
    questionResponseIds: {},
    error: null,
  }
};

const responsesSlice = createSlice({
  name: "options/responses",
  initialState: responsesInitialState,
  reducers: {
    /**
     * Clear response status for new survey attempts
     */
    clearResponseStatus: (state) => {
      state.responseStatus = {
        submitted: false,
        surveyResponseId: null,
        questionResponseIds: {},
        error: null,
      };
    }
  },
  extraReducers: (builder) => {
    // Handle responses
    builder
      // Submit initial response
      .addCase(submitInitialQuestionResponse.pending, (state) => {
        if (state.responseStatus) state.responseStatus.error = null;
      })
      .addCase(submitInitialQuestionResponse.fulfilled, (state, action) => {
        if (!state.responseStatus) return;
        const { surveyResponse, questionResponse } = action.payload;
        state.responseStatus.surveyResponseId = surveyResponse._id;
        state.responseStatus.uuid = surveyResponse.uuid;
        state.responseStatus.questionResponseIds[questionResponse.questionId] = questionResponse._id;
      })
      .addCase(submitInitialQuestionResponse.rejected, (state, action) => {
        if (state.responseStatus) state.responseStatus.error = action.payload || 'Failed to submit response';
      })
      
      // Submit additional response
      .addCase(submitAdditionalQuestionResponse.pending, (state) => {
        if (state.responseStatus) state.responseStatus.error = null;
      })
      .addCase(submitAdditionalQuestionResponse.fulfilled, (state, action) => {
        if (!state.responseStatus) return;
        const { questionResponse } = action.payload;
        state.responseStatus.questionResponseIds[questionResponse.questionId] = questionResponse._id;
      })
      .addCase(submitAdditionalQuestionResponse.rejected, (state, action) => {
        if (state.responseStatus) state.responseStatus.error = action.payload || 'Failed to submit additional response';
      })
      
      // Update response
      .addCase(updateQuestionResponse.pending, (state) => {
        if (state.responseStatus) state.responseStatus.error = null;
      })
      .addCase(updateQuestionResponse.rejected, (state, action) => {
        if (state.responseStatus) state.responseStatus.error = action.payload || 'Failed to update response';
      })
      
      // Complete survey
      .addCase(completeSurveyResponse.pending, (state) => {
        if (state.responseStatus) state.responseStatus.error = null;
      })
      .addCase(completeSurveyResponse.fulfilled, (state) => {
        if (state.responseStatus) state.responseStatus.submitted = true;
      })
      .addCase(completeSurveyResponse.rejected, (state, action) => {
        if (state.responseStatus) state.responseStatus.error = action.payload || 'Failed to complete survey';
      })
      
      // Fetch response by UUID
      .addCase(fetchSurveyResponseByUUID.pending, (state) => {
        if (state.responseStatus) state.responseStatus.error = null;
      })
      .addCase(fetchSurveyResponseByUUID.fulfilled, (state, action) => {
        const surveyResponse = action.payload;
        if (surveyResponse && state.responseStatus) {
          state.responseStatus.surveyResponseId = surveyResponse._id;
          state.responseStatus.uuid = surveyResponse.uuid;
          
          // Process question responses
          if (surveyResponse.questionResponses && Array.isArray(surveyResponse.questionResponses)) {
            surveyResponse.questionResponses.forEach((response: any) => {
              if (response && response.questionId) {
                state.responseStatus!.questionResponseIds[response.questionId] = response._id;
              }
            });
          }
        }
      })
      .addCase(fetchSurveyResponseByUUID.rejected, (state, action) => {
        if (state.responseStatus) state.responseStatus.error = action.payload || 'Failed to fetch existing survey response';
      });
  }
});

// Export actions from both slices
export const {
  setOnHoverOptionID,
  clearOnHoverOptionID
} = metadataSlice.actions;

export const {
  clearResponseStatus
} = responsesSlice.actions;

// Export reducers
export const metadataReducer = metadataSlice.reducer;
export const responsesReducer = responsesSlice.reducer;