import { configureStore } from "@reduxjs/toolkit";
import initSurveySlice from "../features/initSurveySlice";
import updateOptionSlice from "../features/adjustQvOptionSlice";

const store = configureStore({
  reducer: {
    sampleSurvey: initSurveySlice.reducer,
    updateOption: updateOptionSlice.reducer
  }
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
export default store;
