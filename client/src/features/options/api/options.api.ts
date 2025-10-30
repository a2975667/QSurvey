import { createAsyncThunk } from "@reduxjs/toolkit";
import { API_PREFIX } from "../../../config";
import { IBackendQuestion } from "../../../types/backendTypes";
import {
  IAdditionalQuestionResponsePayload,
  ICompleteSurveyResponsePayload,
  IBatchQuestionResponsesPayload,
  IFetchSurveyResponseByUUIDPayload,
  IInitialQuestionResponsePayload,
  IUpdateQuestionResponsePayload
} from "../types/options.types";

/**
 * Fetches sample options for a survey
 */
export const fetchSampleOptions = createAsyncThunk<IBackendQuestion[], string>(
  "options/fetchSampleOptions",
  async (surveyKey) => {
    const response = await fetch(`${API_PREFIX}/surveys/${surveyKey}`);
    const data = await response.json();
    return data.questions;
  }
);

/**
 * Fetches an existing survey response by UUID
 */
export const fetchSurveyResponseByUUID = createAsyncThunk(
  "options/fetchSurveyResponseByUUID",
  async (payload: IFetchSurveyResponseByUUIDPayload, { rejectWithValue }) => {
    try {
      // Build query parameters for GET request
      const params = new URLSearchParams();
      params.append('uuid', payload.uuid);
      params.append('surveyId', payload.surveyId);
      if (payload.sKey) params.append('sKey', payload.sKey);
      if (payload.uKey) params.append('uKey', payload.uKey);
      
      const response = await fetch(`${API_PREFIX}/survey/responses?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue({ message: error?.message || 'Unknown error occurred' });
    }
  }
);

/**
 * Creates a new survey response with the first question response
 */
export const submitInitialQuestionResponse = createAsyncThunk(
  "options/submitInitialQuestionResponse",
  async (payload: IInitialQuestionResponsePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_PREFIX}/survey/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          IsNewSurveyResponse: true,
          surveyId: payload.surveyId,
          questionId: payload.questionId,
          responseContent: payload.responseContent,
          sKey: payload.sKey,
          uKey: payload.uKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue({ message: error?.message || 'Unknown error occurred' });
    }
  }
);

/**
 * Adds additional question responses to an existing survey response
 */
export const submitAdditionalQuestionResponse = createAsyncThunk(
  "options/submitAdditionalQuestionResponse",
  async (payload: IAdditionalQuestionResponsePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_PREFIX}/survey/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: payload.uuid,
          surveyResponseId: payload.surveyResponseId,
          surveyId: payload.surveyId,
          questionId: payload.questionId,
          responseContent: payload.responseContent,
          sKey: payload.sKey,
          uKey: payload.uKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue({ message: error?.message || 'Unknown error occurred' });
    }
  }
);

/**
 * Updates an existing question response
 */
export const updateQuestionResponse = createAsyncThunk(
  "options/updateQuestionResponse",
  async (payload: IUpdateQuestionResponsePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_PREFIX}/survey/responses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: payload.uuid,
          surveyResponseId: payload.surveyResponseId,
          questionResponseId: payload.questionResponseId,
          surveyId: payload.surveyId,
          questionId: payload.questionId,
          responseContent: payload.responseContent,
          sKey: payload.sKey,
          uKey: payload.uKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue({ message: error?.message || 'Unknown error occurred' });
    }
  }
);

/**
 * Completes a survey response
 */
export const completeSurveyResponse = createAsyncThunk(
  "options/completeSurveyResponse",
  async (payload: ICompleteSurveyResponsePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_PREFIX}/survey/responses/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: payload.uuid,
          surveyResponseId: payload.surveyResponseId,
          surveyId: payload.surveyId,
          sKey: payload.sKey,
          uKey: payload.uKey,
          metadata: payload.metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue({ message: error?.message || 'Unknown error occurred' });
    }
  }
);

/**
 * Submits a batch of question responses for non-QV questions
 */
export const submitBatchQuestionResponses = createAsyncThunk(
  "options/submitBatchQuestionResponses",
  async (payload: IBatchQuestionResponsesPayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_PREFIX}/survey/responses/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: payload.surveyId,
          responses: payload.responses,
          uuid: payload.uuid,
          surveyResponseId: payload.surveyResponseId,
          sKey: payload.sKey,
          uKey: payload.uKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue({ message: error?.message || 'Unknown error occurred' });
    }
  }
);
