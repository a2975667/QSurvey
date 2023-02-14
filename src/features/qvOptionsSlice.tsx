import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IQvOption, IQvOptionsSlice } from "../types/coreTypes";
import { API_PREFIX } from "../congif";
import { IBackendQuestion } from "../types/backendTypes";

const initialState: IQvOptionsSlice = {
  loaded: false,
  byId: {},
  positions: {}
}

export const fetchSampleOptions = createAsyncThunk<IBackendQuestion[], string>(
  "options/fetchSampleOptions",
  async (surveyKey) => {
    const response = await fetch(API_PREFIX + '/surveys/' + surveyKey);
    const data = await response.json();
    return data.questions;
  }
);

const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    createCategories: (state, action) => {
      const { selfDefinedCategories } = action.payload;
      selfDefinedCategories.forEach((category: string) => {
        state.positions[category] = [];
      });
    },
    // there is small probability that the optionid clases. 
    // This is not encforced by the backend, required backend fix
    // also it can be that the same optionId is used in different questions
    updateOptionPosition: (state, action) => {
      const {optionId, originalCategory, newCategory, newPosition} = action.payload;

      // if this is the same category, then we need to update the position
      if (originalCategory === newCategory) {
        const oldIndex = state.positions[originalCategory].indexOf(optionId);
        const newList = [...state.positions[originalCategory]];
        newList.splice(oldIndex, 1);
        newList.splice(newPosition, 0, optionId);
        state.positions[originalCategory] = newList;
      } else {
      const newList = [...state.positions[newCategory]];
      newList.splice(newPosition, 0, optionId);
      state.positions[newCategory] = newList;
      state.positions[originalCategory] = state.positions[originalCategory].filter(id => id !== optionId);
      }

      state.byId[optionId].group = newCategory;
      state.byId[optionId].position = newPosition;
    },
    updateOptionVotes: (state, action) => {
      const { optionId, newVote } = action.payload;
      state.byId[optionId].votes = newVote;
    },
    clearAllOptionVotesByOptionKeys: (state, action) => {
      const { optionKeys } = action.payload;
      optionKeys.forEach((keys: string) => {
        state.byId[keys].votes = 0;
      });
    },
    updateOptionGroup: (state, action) => {
      // this can only be trigger by a button click, otherwise the position will be messed up
      const { optionId, newGroup } = action.payload;
      console.log(optionId, newGroup)
      // udpate the group position by appending the ID and remove the ID from its old group
      state.positions[newGroup].push(optionId);
      state.positions[state.byId[optionId].group] = state.positions[state.byId[optionId].group].filter(id => id !== optionId);
      
      // update the option itself
      state.byId[optionId].group = newGroup;
      state.byId[optionId].groupPosition = state.positions[newGroup].length - 1;
    },
    setPositionGroups: (state, action) => {
      console.log(action.payload)
      const { positions } = action.payload;
      positions.forEach((position: string) => {
        state.positions[position] = [];
      }
      );
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleOptions.fulfilled, (state, action) => {
        
        // create a variable with type of dictionary of IQvOption initialized with empty object
        const byId: { [key: string]: IQvOption } = {};
        const initialPostions: { [key: string]: string[] } = {};
        action.payload.forEach((question: IBackendQuestion) => {
          let currQuestionId = question._id;
          
          // create a list of integers from 0 to the length of the options array
          const positions = Array.from({ length: question.options.length }, (_, index) => index);
          positions.sort(() => Math.random() - 0.5);

          question.options.forEach((option, _) => {
            const placePosition = positions.shift()!;
            const tempQvOption: IQvOption = {
              optionId: option.optionId,
              description: option.description,
              optionName: option.optionName,
              questionId: currQuestionId,
              group: "Undecided",
              votes: 0,
              position: placePosition,
            };
            
            byId[option.optionId] = tempQvOption;
            // place tempQvOption.optionId into the postions dictionary based on group and insert it into the index positon of an empt array
            if (initialPostions[tempQvOption.group] === undefined) {
              initialPostions[tempQvOption.group] = [];
            }
            initialPostions[tempQvOption.group].splice(tempQvOption.position, 0, tempQvOption.optionId);
          });
        });
        state.positions = initialPostions;
        state.byId = byId;
        state.loaded = true;

      })
      .addCase(fetchSampleOptions.rejected, (state, action) => {
        state.loaded = false;
      })
      .addCase(fetchSampleOptions.pending, (state, action) => {
        state.loaded = false;
      });

  }
});

export const { 
  updateOptionVotes, 
  updateOptionPosition,
  clearAllOptionVotesByOptionKeys, 
  updateOptionGroup,
  createCategories,
  setPositionGroups } = optionsSlice.actions;

export default optionsSlice;