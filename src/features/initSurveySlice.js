import { createSlice } from "@reduxjs/toolkit";
import { sampleSurvey } from "../__api__/mock-api";

const initSurveySlice = createSlice({
  name: "sampleSurvey",
  initialState: sampleSurvey,
  reducers: {
    setSampleSurvey: (state, action) => {
      state.questions = action.payload.questions;
    },
    updateOption: (state, action) => {
      const { questionIndex, optionIndex, updatedOption } = action.payload;
      state.questions[questionIndex].options[optionIndex] = {
        ...state.questions[questionIndex].options[optionIndex],
        ...updatedOption
      };
    }
  }
});

export const { setSampleSurvey, updateOption } = initSurveySlice.actions;
export const fetchSampleSurvey = () => dispatch => {
  dispatch(setSampleSurvey(sampleSurvey));
};
export default initSurveySlice;


