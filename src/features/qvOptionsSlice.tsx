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
      console.log(selfDefinedCategories);
      selfDefinedCategories.forEach((category: string) => {
        console.log(category);
        state.positions[category] = [];
      });
    },
    // there is small probability that the optionid clases. 
    // This is not encforced by the backend, required backend fix
    // also it can be that the same optionId is used in different questions
    updateOptionPosition: (state, action) => {
      const {optionId, originalCategory, newCategory, newPosition} = action.payload;
      const newList = [...state.positions[newCategory]];
      newList.splice(newPosition, 0, optionId);
      state.positions[newCategory] = newList;
      state.positions[originalCategory] = state.positions[originalCategory].filter(id => id !== optionId);
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
      const { optionId, newGroup } = action.payload;
      state.byId[optionId].group = newGroup;
    },
    setPositionGroups: (state, action) => {
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
            }
            //tempQvOption.position = placePosition!; // TODO -- why does this break the app?
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
  clearAllOptionVotesByOptionKeys, 
  updateOptionGroup,
  createCategories,
  setPositionGroups } = optionsSlice.actions;

export default optionsSlice;