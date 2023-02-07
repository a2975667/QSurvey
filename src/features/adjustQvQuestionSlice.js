import { createSlice } from "@reduxjs/toolkit";

const adjustQVQuestionSlice = createSlice({
  name: "adjustQVQuestion",
  initialState: {
    remainingCredits: 0
  },
  reducers: {
    updateRemainingCredit: (state, action) => {
      state.remainingCredits = action.payload.remainingCredits;
    }
  }
});

export const { updateRemainingCredit } = adjustQVQuestionSlice.actions;
export default adjustQVQuestionSlice;
