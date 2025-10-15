import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_PREFIX } from "../config";
import moment from "moment";
import { IBackendSurvey } from "../types/backendTypes";

// fetch call duplicated in three slices due to api returning all data in one call
export const fetchMetaData = createAsyncThunk<IBackendSurvey, string>(
  "questions/fetchMetaData",
  async (surveyKey: string) => {
    const response = await fetch(API_PREFIX + "/surveys/" + surveyKey);
    const data = (await response.json()) as IBackendSurvey;
    return data;
  }
);

interface IMetadataState {
  isAvailable: Boolean;
  loaded: Boolean;
  uuid: string;          // Internal ID for the session
  resumeUuid?: string;   // UUID from URL for resuming a session
  surveyId: string;
  startTime: number;
  endTime?: number;
  sKey?: string;
  uKey?: string;
}

const initialState: IMetadataState = {
  isAvailable: false,
  loaded: false,
  uuid: "",
  resumeUuid: undefined,
  surveyId: "",
  startTime: moment().unix(),
  sKey: undefined,
  uKey: undefined
};

const metadataSlice = createSlice({
  name: "metadata",
  initialState,
  reducers: {
    setMetadataFromSurvey: (state, action) => {
      const survey: IBackendSurvey = action.payload;
      state.isAvailable = survey?.settings?.isAvailable ?? false;
      state.surveyId = survey?._id || '';
      state.startTime = moment().unix();
      state.loaded = true;

      if (survey?.settings?.hasSKey && survey?.settings?.sKeyValue) {
        state.sKey = survey.settings.sKeyValue;
      }
    },
    setUKey: (state, action) => {
      state.uKey = action.payload;
    },
    setSKey: (state, action) => {
      state.sKey = action.payload;
    },
    setUuid: (state, action) => {
      state.resumeUuid = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetaData.fulfilled, (state, action) => {
        // Add null check to handle case where settings might be undefined
        state.isAvailable = action.payload?.settings?.isAvailable ?? false;
        state.surveyId = action.payload?._id || "";
        state.startTime = moment().unix();
        state.loaded = true;
        
        // Store survey key if present
        if (action.payload?.settings?.hasSKey && action.payload?.settings?.sKeyValue) {
          state.sKey = action.payload.settings.sKeyValue;
        }
        
        // uKey will typically come from the frontend via URL params, but we
        // could also get it from query params if implemented
      })
      .addCase(fetchMetaData.rejected, (state, action) => {
        state.loaded = false;
      })
      .addCase(fetchMetaData.pending, (state, action) => {
        state.loaded = false;
      });
  },
});

export const { setMetadataFromSurvey, setUKey, setSKey, setUuid } = metadataSlice.actions;

export default metadataSlice;
