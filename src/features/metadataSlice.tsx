import { createSlice } from "@reduxjs/toolkit";
import { sampleSurvey } from "../__api__/mock-api";
import { Dispatch } from 'redux';

const metadataSlice = createSlice({
  name: "initSurvey",
  initialState: {
    surveyStatus: "unknown",
  },
  reducers: {
    setSampleSurvey: (state, action) => {
      state.surveyStatus = action.payload.metadata.surveyStatus;
    },
  }
});

export const { setSampleSurvey } = metadataSlice.actions;
export const fetchSampleSurvey = () => (dispatch: Dispatch) => {
  dispatch(setSampleSurvey(sampleSurvey));
};


export default metadataSlice;
