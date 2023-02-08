import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { sampleSurvey, mockApi } from "../__api__/mock-api";

export const fetchMetaData = createAsyncThunk(
  "metadata/fetchMetaData",
  async () => {
    const response = await mockApi(sampleSurvey);
    return response.metadata;
  }
);

const metadataSlice = createSlice({
  name: "metadata",
  initialState: {
    surveyStatus: "unknown",
    loaded: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetaData.fulfilled, (state, action) => {
        state.surveyStatus = action.payload.surveyStatus;
        state.loaded = true;
      })
      .addCase(fetchMetaData.rejected, (state, action) => {
        state.loaded = false
      })
      .addCase(fetchMetaData.pending, (state, action) => {
        state.loaded = false
      });
  }

});

export const { } = metadataSlice.actions;

export default metadataSlice;
