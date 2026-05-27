import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_PREFIX } from "../config";
import { IBackendSurvey } from "../types/backendTypes";

// fetch call duplicated in three slices due to api returning all data in one call
export const fetchMetaData = createAsyncThunk<IBackendSurvey, string>(
  "questions/fetchMetaData",
  async (surveyKey: string) => {
    const response = await fetch(API_PREFIX + "/surveys/" + surveyKey);
    const data = (await response.json()) as IBackendSurvey;
    if (!response.ok) {
      throw new Error((data as any)?.message || "Failed to fetch survey metadata");
    }
    if (!data?._id || !data?.settings) {
      throw new Error("Invalid survey metadata response");
    }
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
  respondentsCanViewResults?: boolean;
  locale?: 'en-US' | 'zh-TW';
}

const nowUnix = () => Math.floor(Date.now() / 1000);

const initialState: IMetadataState = {
  isAvailable: false,
  loaded: false,
  uuid: "",
  resumeUuid: undefined,
  surveyId: "",
  startTime: nowUnix(),
  sKey: undefined,
  uKey: undefined,
  respondentsCanViewResults: undefined
};

const metadataSlice = createSlice({
  name: "metadata",
  initialState,
  reducers: {
    setMetadataFromSurvey: (state, action) => {
      const survey: IBackendSurvey = action.payload;
      state.isAvailable = survey?.settings?.isAvailable ?? false;
      state.surveyId = survey?._id || '';
      state.respondentsCanViewResults =
        survey?.settings?.respondentsCanViewResults !== false;
      state.locale = survey?.settings?.locale || 'en-US';
      state.startTime = nowUnix();
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
    resetMetadata: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetaData.fulfilled, (state, action) => {
        // Add null check to handle case where settings might be undefined
        state.isAvailable = action.payload?.settings?.isAvailable ?? false;
        state.surveyId = action.payload?._id || "";
        state.respondentsCanViewResults =
          action.payload?.settings?.respondentsCanViewResults !== false;
        state.locale = action.payload?.settings?.locale || 'en-US';
        state.startTime = nowUnix();
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
        state.respondentsCanViewResults = undefined;
        state.locale = undefined;
      })
      .addCase(fetchMetaData.pending, (state, action) => {
        state.loaded = false;
        state.respondentsCanViewResults = undefined;
        state.locale = undefined;
      });
  },
});

export const { setMetadataFromSurvey, setUKey, setSKey, setUuid, resetMetadata } = metadataSlice.actions;

export default metadataSlice;
