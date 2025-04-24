import { configureStore } from "@reduxjs/toolkit";
import metadataSlice from "../features/metadataSlice";
import qsOptionsSlice from "../features/qsOptionsSlice";
import questionsSlice from "../features/questionsSlice";
import authSlice from "../features/authSlice";
import surveysSlice from "../features/surveysSlice";
import thunkMiddleware from "redux-thunk";
import { eventRecorderMiddleware } from "../components/Tracker/reduxRecorderMiddleware";

// Create the store with our reducers
const store = configureStore({
  reducer: {
    metadata: metadataSlice.reducer,
    qsOptions: qsOptionsSlice.reducer, // Using the re-exported modular reducer 
    questions: questionsSlice.reducer,
    auth: authSlice.reducer,
    surveys: surveysSlice.reducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(thunkMiddleware).concat(eventRecorderMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
