import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { sampleSurvey, mockApi } from "../__api__/mock-api";

export const fetchSampleQuestions = createAsyncThunk(
  "questions/fetchSampleQuestions",
  async () => {
    const response = await mockApi(sampleSurvey);
    return response.questions;
  }
);

const questionsSlice = createSlice({
  name: "questions",
  initialState: {
    byId: {},
    allIds: [],
    loaded: false,
  },
  reducers: {
    setSampleQuestions: (state, action) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },
    updateQuestionFields: (state, action) => {
      const { questionID, fields } = action.payload;
      Object.assign(state.byId[questionID], fields);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleQuestions.fulfilled, (state, action) => {
        state.byId = action.payload.byId;
        state.allIds = action.payload.allIds;
        state.loaded = true;
      })
      .addCase(fetchSampleQuestions.rejected, (state, action) => {
        state.loaded = false
      })
      .addCase(fetchSampleQuestions.pending, (state, action) => {
        state.loaded = false
      });
  }
});

export const { updateQuestionFields } = questionsSlice.actions;

export default questionsSlice;





// addQuestion: (state, action) => {
//   const { question } = action.payload;
//   state.byId[question.questionID] = question;
//   state.allIds.push(question.questionID);
// },