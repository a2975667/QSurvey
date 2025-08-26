import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IVotesState, IUpdateOptionVotesPayload, IOptionKeysPayload } from "../types/options.types";

const initialState: IVotesState = {
  byId: {}
};

const votesSlice = createSlice({
  name: "options/votes",
  initialState,
  reducers: {
    /**
     * Update votes for a specific option
     */
    updateOptionVotes: (state, action: PayloadAction<IUpdateOptionVotesPayload>) => {
      const { optionId, newVote } = action.payload;
      if (state.byId && state.byId[optionId]) {
        state.byId[optionId].votes = newVote;
      } else {
        console.error(`Option with ID ${optionId} not found in state`);
      }
    },
    
    /**
     * Clear votes for multiple options
     */
    clearAllOptionVotesByOptionKeys: (state, action: PayloadAction<IOptionKeysPayload>) => {
      if (!action.payload || !action.payload.optionKeys) {
        console.error("Invalid payload for clearAllOptionVotesByOptionKeys");
        return;
      }
      
      const { optionKeys } = action.payload;
      if (!Array.isArray(optionKeys)) {
        console.error("optionKeys must be an array");
        return;
      }
      
      optionKeys.forEach((key: string) => {
        if (state.byId && state.byId[key]) {
          state.byId[key].votes = 0;
        } else {
          console.error(`Option with ID ${key} not found in state when clearing votes`);
        }
      });
    },
    
    /**
     * Add one vote to each option in a list
     */
    addOneVoteToAllOptionsByOptionKeys: (state, action: PayloadAction<IOptionKeysPayload>) => {
      if (!action.payload || !action.payload.optionKeys) {
        console.error("Invalid payload for addOneVoteToAllOptionsByOptionKeys");
        return;
      }
      
      const { optionKeys } = action.payload;
      if (!Array.isArray(optionKeys)) {
        console.error("optionKeys must be an array");
        return;
      }
      
      optionKeys.forEach((key: string) => {
        if (state.byId && state.byId[key]) {
          state.byId[key].votes += 1;
        } else {
          console.error(`Option with ID ${key} not found in state when adding vote`);
        }
      });
    }
  }
});

export const {
  updateOptionVotes,
  clearAllOptionVotesByOptionKeys,
  addOneVoteToAllOptionsByOptionKeys
} = votesSlice.actions;

export default votesSlice.reducer;