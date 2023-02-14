import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_PREFIX } from "../congif";
import moment, { Moment } from "moment";
import { IBackendQuestion, IBackendSurvey } from "../types/backendTypes";

// fetch call duplicated in three slices due to api returning all data in one call
export const fetchMetaData = createAsyncThunk<IBackendSurvey, string>(
  "questions/fetchMetaData",
  async (surveyKey: string) => {
    const response = await fetch(API_PREFIX + "/surveys/" + surveyKey);
    console.log(API_PREFIX + "/surveys/" + surveyKey);
    const data = (await response.json()) as IBackendSurvey;
    return data;
  }
);

interface IMetadataState {
  isAvailable: Boolean;
  loaded: Boolean;
  uuid: string;
  startTime: number;
  endTime?: number;
}

const initialState: IMetadataState = {
  isAvailable: false,
  loaded: false,
  uuid: "",
  startTime: moment().unix(),
};

const metadataSlice = createSlice({
  name: "metadata",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetaData.fulfilled, (state, action) => {
        state.isAvailable = action.payload.settings.isAvailable;
        state.startTime = moment().unix();
        state.loaded = true;
      })
      .addCase(fetchMetaData.rejected, (state, action) => {
        state.loaded = false;
      })
      .addCase(fetchMetaData.pending, (state, action) => {
        state.loaded = false;
      });
  },
});

export const {} = metadataSlice.actions;

export default metadataSlice;
