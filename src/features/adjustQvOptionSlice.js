import { createSlice } from "@reduxjs/toolkit";

const updateOptionSlice = createSlice({
  name: "updateOption",
  initialState: [],
  reducers: {
    updateVoteCount: (state, action) => {
        const { questionIndex, optionIndex, voteCount } = action.payload;
        state.questions[questionIndex].options[optionIndex].votes = voteCount;
    }
  }
});

export const { incrementOption, decrementOption, updateVoteCount } = updateOptionSlice.actions;
export default updateOptionSlice;
