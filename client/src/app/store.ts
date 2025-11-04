import { combineReducers, configureStore } from "@reduxjs/toolkit";
import metadataSlice from "../features/metadataSlice";
import questionsSlice from "../features/questionsSlice";
import authSlice from "../features/authSlice";
import surveysSlice from "../features/surveysSlice";
import unifiedResponsesReducer from "../features/unifiedResponsesSlice";
import thunkMiddleware from "redux-thunk";
import { eventRecorderMiddleware } from "../components/Tracker/reduxRecorderMiddleware";
import telemetryMiddleware from "../telemetry/middleware";
import { TelemetryAggregator } from "../telemetry/aggregator";

const rootReducer = combineReducers({
  metadata: metadataSlice.reducer,
  questions: questionsSlice.reducer,
  auth: authSlice.reducer,
  surveys: surveysSlice.reducer,
  unifiedResponses: unifiedResponsesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

// Create the store with our reducers
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(thunkMiddleware)
      .concat(telemetryMiddleware)
      .concat(eventRecorderMiddleware),
});

// Lightweight global telemetry collector for UI clicks (dev/tests)
export const surveyTelemetry = new TelemetryAggregator();

export type AppDispatch = typeof store.dispatch;

export default store;
