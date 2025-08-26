import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { IQuestionGroup } from '../types/coreTypes';
import { API_PREFIX } from '../config';
import { IBackendSurvey, IBackendQuestionGroup } from '../types/backendTypes';

interface SurveysState {
  questionGroups: IQuestionGroup[];
  loaded: boolean;
}

const initialState: SurveysState = {
  questionGroups: [],
  loaded: false
};

// Async thunk for fetching survey data including question groups
export const fetchSurveyData = createAsyncThunk<IBackendSurvey, string>(
  'surveys/fetchSurveyData',
  async (surveyId: string) => {
    const response = await fetch(`${API_PREFIX}/surveys/${surveyId}`);
    return await response.json();
  }
);

const surveysSlice = createSlice({
  name: 'surveys',
  initialState,
  reducers: {
    setQuestionGroups: (state, action: PayloadAction<IQuestionGroup[]>) => {
      state.questionGroups = action.payload;
    },
    addQuestionGroup: (state, action: PayloadAction<IQuestionGroup>) => {
      state.questionGroups.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSurveyData.fulfilled, (state, action) => {
        // Extract question groups if they exist
        if (action.payload.questionGroups && Array.isArray(action.payload.questionGroups)) {
          state.questionGroups = action.payload.questionGroups.map((group: IBackendQuestionGroup) => ({
            id: group.id,
            title: group.title,
            description: group.description || '',
            questionIds: group.questionIds || []
          }));
        }
        state.loaded = true;
      })
      .addCase(fetchSurveyData.rejected, (state) => {
        state.loaded = false;
      })
      .addCase(fetchSurveyData.pending, (state) => {
        state.loaded = false;
      });
  }
});

export const { setQuestionGroups, addQuestionGroup } = surveysSlice.actions;
export default surveysSlice;