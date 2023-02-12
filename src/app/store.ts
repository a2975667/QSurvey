import { configureStore } from "@reduxjs/toolkit";
import metadataSlice from "../features/metadataSlice";
import optionsSlice from "../features/qvOptionsSlice";
import questionsSlice from "../features/questionsSlice";
import thunkMiddleware from "redux-thunk";

const store = configureStore({
  reducer: {
    metadata: metadataSlice.reducer,
    qvOptions: optionsSlice.reducer,
    questions: questionsSlice.reducer
  },
  middleware: [thunkMiddleware],
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export default store;
