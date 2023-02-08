import { applyMiddleware, configureStore } from "@reduxjs/toolkit";
import metadataSlice from "../features/metadataSlice";
import updateOptionSlice from "../features/qvOptionsSlice";
import questionsSlice from "../features/questionsSlice";
import thunk from "redux-thunk";

const store = configureStore({
  reducer: {
    metadata: metadataSlice.reducer,
    qvOptions: updateOptionSlice.reducer,
    questions: questionsSlice.reducer
  },
  middleware: [thunk],
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export default store;
