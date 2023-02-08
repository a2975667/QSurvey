import { createSlice } from "@reduxjs/toolkit";
import { sampleSurvey } from "../__api__/mock-api";
import { Dispatch } from 'redux';

const questionsSlice = createSlice({
  name: "questions",
  initialState: {
    byId: {},
    allIds: []
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
  }
});

export const { setSampleQuestions, updateQuestionFields } = questionsSlice.actions;
export const fetchSampleQuestions = () => (dispatch: Dispatch) => {
  dispatch(setSampleQuestions(sampleSurvey.questions));
};

export default questionsSlice;





// addQuestion: (state, action) => {
//   const { question } = action.payload;
//   state.byId[question.questionID] = question;
//   state.allIds.push(question.questionID);
// },