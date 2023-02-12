import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_PREFIX } from "../congif";
import moment, { Moment } from "moment";

// fetch call duplicated in three slices due to api returning all data in one call
export const fetchMetaData = createAsyncThunk(
  "questions/fetchMetaData",
  async (surveyKey) => {
    const response = await fetch(API_PREFIX + '/surveys/' + surveyKey);
    const data = await response.json();
    return data;
  }
);

interface IMetadataState {
  isAvaliable: Boolean;
  loaded: Boolean;
  uuid: string;
  startTime: Moment;
  endTime?: Moment;
}

const initialState: IMetadataState = {
  isAvaliable: false,
  loaded: false,
  uuid: "",
  startTime: moment(),
}

const metadataSlice = createSlice({
  name: "metadata",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetaData.fulfilled, (state, action) => {
        state.isAvaliable = action.payload.settings.isAvaliable;
        state.startTime = moment()
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

export const {} = metadataSlice.actions;

export default metadataSlice;
