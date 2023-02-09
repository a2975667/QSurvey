import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { sampleSurvey, mockApi } from "../__api__/mock-api";
import { Dispatch } from 'redux';
import { question } from "../types/coreTypes";

export const fetchSampleOptions = createAsyncThunk(
    "options/fetchSampleOptions",
    async () => {
        const response = await mockApi(sampleSurvey);
        return response.qvOptions;
    }
);

const optionsSlice = createSlice({
    name: "options",
    initialState: {
        byId: {},
        loaded: false,
    },
    reducers: {
        updateOptionField: (state, action) => {
            const { optionID, field, value } = action.payload;
            state.byId[optionID][field] = value;
        },
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchSampleOptions.fulfilled, (state, action) => {
          state.byId = action.payload.byId;
          state.loaded = true;
        })
        .addCase(fetchSampleOptions.rejected, (state, action) => {
          state.loaded = false
        })
        .addCase(fetchSampleOptions.pending, (state, action) => {
          state.loaded = false
        });
    }
  });

export const { updateOptionField } = optionsSlice.actions;

export default optionsSlice;