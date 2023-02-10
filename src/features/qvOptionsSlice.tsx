import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { sampleSurvey, mockApi } from "../__deprecated__api__/mock-api";
import { Dispatch } from 'redux';
import { IQvOption, IQvOptionsSlice } from "../types/coreTypes";
import { API_PREFIX } from "../congif";
import { IBackendQuestion } from "../types/backendTypes";

const initialState: IQvOptionsSlice = {
  loaded: false,
  byId: {}
}

export const fetchSampleOptions = createAsyncThunk(
  "options/fetchSampleOptions",
  async (surveyKey) => {
    const response = await fetch(API_PREFIX + '/surveys/' + surveyKey);
    const data = await response.json();
    return data.questions;
  }
);

const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    // there is small probability that the optionid clases. 
    // This is not encforced by the backend, required backend fix
    // also it can be that the same optionId is used in different questions
    updateOptionVotes: (state, action) => {
      console.log(action.payload);
      const { optionId, newVote } = action.payload;
      console.log(state.byId[optionId]);
      state.byId[optionId].votes = newVote;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleOptions.fulfilled, (state, action) => {
        // create a variable with type of dictionary of IQvOption initialized with empty object
        const byId: { [key: string]: IQvOption } = {};
        action.payload.forEach((question: IBackendQuestion) => {
          let currQuestionId = question._id;

          question.options.forEach((option, index) => {
            const tempQvOption: IQvOption = {
              optionId: option.optionId,
              description: option.description,
              optionName: option.optionName,
              questionId: currQuestionId,
              group: "Undefined",
              votes: 0,
              position: index,
            }
            
            byId[option.optionId] = tempQvOption;
            
          });
        });

        state.byId = byId;
        state.loaded = true;
      })
      .addCase(fetchSampleOptions.rejected, (state, action) => {
        state.loaded = false;
      })
      .addCase(fetchSampleOptions.pending, (state, action) => {
        state.loaded = false;
      });

  }
});

// updateOptionField: (state, action) => {
//   const { optionID, field, value } = action.payload;
//   state.byId[optionID][field] = value;
// },

export const { updateOptionVotes } = optionsSlice.actions;

export default optionsSlice;