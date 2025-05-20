import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IQuestion, IQsOption, IQsOptionsSlice } from "../types/coreTypes";
import { API_PREFIX } from "../config";
import { IBackendQuestion } from "../types/backendTypes";
import {
  fetchSurveyResponseByUUID,
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse
} from "./options/api/options.api";

const initialState: IQsOptionsSlice = {
  loaded: false,
  byId: {},
  positions: {},
  categorySequence: {
    hasUndecided: true,
    hasSkip: true,
    userDefinedCategories: [],
    currentViewCategories: [],
  },
  metadata: {
    onHoverOptionId: null,
  },
  responseStatus: {
    submitted: false,
    surveyResponseId: null,
    uuid: undefined,
    questionResponseIds: {},
    error: null,
  }
};

export const fetchSampleOptions = createAsyncThunk<IBackendQuestion[], string>(
  "options/fetchSampleOptions",
  async (surveyKey) => {
    //const response = await fetch(API_PREFIX + '/surveys/' + surveyKey + '?numOptions=' + optionNumber);
    const response = await fetch(API_PREFIX + "/surveys/" + surveyKey);
    const data = await response.json();
    return data.questions;
  }
);

const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    resetQsOptions: () => {
      return initialState;
    },
    initQsOptions: (state, action) => {
      // BUG: this will break for multiple questions.
      // BUG: replace it with list of questions
      // List order of keys in action.payload.byId
      const questionSequence = Object.keys(action.payload.byId);

      // create a variable with type of dictionary of IQsOption initialized with empty object
      const byId: { [key: string]: IQsOption } = {};
      const initialPostions: { [key: string]: string[] } = {};

      questionSequence.forEach((questionId: string) => {
        const currQuestion: IQuestion = action.payload.byId[questionId];
        // console.log(currQuestion);

        // create a list of integers from 0 to the length of the options array
        const positions = Array.from(
          { length: currQuestion.rawOptions!.length },
          (_, index) => index
        );
        positions.sort(() => Math.random() - 0.5);

        // console.log(positions);

        currQuestion.rawOptions!.forEach((option, _) => {
          const placePosition = positions.shift()!;

          const tempQsOption: IQsOption = {
            optionId: option.optionId,
            description: option.description,
            optionName: option.optionName,
            questionId: questionId,
            group: "Undecided",
            votes: 0,
            position: placePosition,
          };
          byId[option.optionId] = tempQsOption;

          // console.log(initialPostions);

          // create an empty list if tempQsOption.optionId's group is not in the postions dictionary
          if (initialPostions[tempQsOption.group] === undefined) {
            initialPostions[tempQsOption.group] = [];
          }

          // insert the tempQsOption.optionId into the empty list based on the placePosition as the index of the list
          initialPostions[tempQsOption.group].splice(
            tempQsOption.position,
            0,
            tempQsOption.optionId
          );
          // console.log(initialPostions);
        });
        state.positions = initialPostions;
        state.byId = byId;
      });

      state.loaded = true;
    },
    createCategories: (state, action) => {
      const { selfDefinedCategories } = action.payload;
      selfDefinedCategories.forEach((category: string) => {
        state.positions[category] = [];
      });
    },
    // there is small probability that the optionid clases.
    // This is not encforced by the backend, required backend fix
    // also it can be that the same optionId is used in different questions
    /**
     * Update an option's position by moving it from one category to another
     * or repositioning it within the same category.
     */
    updateOptionPosition: (state, action) => {
      const { optionId, originalCategory, newCategory, newPosition } = action.payload;
      
      // Step 1: Update the positions map - remove from original and add to new category
      if (state.positions[originalCategory]) {
        const oldIndex = state.positions[originalCategory].indexOf(optionId);
        if (oldIndex !== -1) {
          // Remove from original category
          state.positions[originalCategory] = state.positions[originalCategory].filter(
            id => id !== optionId
          );
        }
      }
      
      // Add to the target category if it exists, otherwise create it
      if (!state.positions[newCategory]) {
        state.positions[newCategory] = [];
      }
      
      // Insert at the specified position
      state.positions[newCategory].splice(
        Math.min(newPosition, state.positions[newCategory].length),
        0,
        optionId
      );
      
      // Step 2: Update the option's category
      if (state.byId[optionId]) {
        state.byId[optionId].group = newCategory;
      }
      
      // Step 3: Recalculate all positions to ensure consistency
      let globalPositionIndex = 0;
      state.categorySequence.currentViewCategories.forEach((category) => {
        const categoryOptions = state.positions[category] || [];
        
        categoryOptions.forEach((id, index) => {
          if (state.byId[id]) {
            // Update groupPosition (position within the category)
            state.byId[id].groupPosition = index;
            
            // Update global position (position across all categories)
            state.byId[id].position = globalPositionIndex;
            globalPositionIndex++;
          }
        });
      });
    },
    updateOptionVotes: (state, action) => {
      // console.log(action.payload);
      const { optionId, newVote } = action.payload;
      if (state.byId && state.byId[optionId]) {
        state.byId[optionId].votes = newVote;
      } else {
        console.error(`Option with ID ${optionId} not found in qsOptions state`);
      }
    },
    clearAllOptionVotesByOptionKeys: (state, action) => {
      if (!action.payload || !action.payload.optionKeys) {
        console.error("Invalid payload for clearAllOptionVotesByOptionKeys in qsOptions");
        return;
      }
      
      const { optionKeys } = action.payload;
      if (!Array.isArray(optionKeys)) {
        console.error("optionKeys must be an array in qsOptions");
        return;
      }
      
      optionKeys.forEach((key: string) => {
        if (state.byId && state.byId[key]) {
          state.byId[key].votes = 0;
        } else {
          console.error(`Option with ID ${key} not found in qsOptions state when clearing votes`);
        }
      });
    },
    addOneVoteToAllOptionsByOptionKeys: (state, action) => {
      if (!action.payload || !action.payload.optionKeys) {
        console.error("Invalid payload for addOneVoteToAllOptionsByOptionKeys in qsOptions");
        return;
      }
      
      const { optionKeys } = action.payload;
      if (!Array.isArray(optionKeys)) {
        console.error("optionKeys must be an array in qsOptions");
        return;
      }
      
      optionKeys.forEach((key: string) => {
        if (state.byId && state.byId[key]) {
          state.byId[key].votes += 1;
        } else {
          console.error(`Option with ID ${key} not found in qsOptions state when adding vote`);
        }
      });
    },
    /**
     * Update an option's category/group assignment.
     * Used during the organization phase when categorizing options.
     */
    updateOptionGroup: (state, action) => {
      const { optionId, newGroup } = action.payload;
      
      // Skip if the option doesn't exist
      if (!state.byId[optionId]) {
        return;
      }
      
      const oldGroup = state.byId[optionId].group;
      
      // Skip if moving to the same group and no other changes needed
      if (oldGroup === newGroup && !(oldGroup === "Undecided" && newGroup === "Undecided")) {
        return;
      }
      
      // Ensure both groups exist
      if (!state.positions[oldGroup]) {
        state.positions[oldGroup] = [];
      }
      
      if (!state.positions[newGroup]) {
        state.positions[newGroup] = [];
      }
      
      // Remove from old group
      state.positions[oldGroup] = state.positions[oldGroup].filter(id => id !== optionId);
      
      // Add to new group (at beginning or end depending on the situation)
      if (oldGroup === "Undecided" && newGroup === "Undecided") {
        // When reshuffling within Undecided, add to the end
        state.positions[newGroup].push(optionId);
      } else {
        // When moving to a categorized group, add to the beginning
        state.positions[newGroup].unshift(optionId);
      }
      
      // Update the option's group property
      state.byId[optionId].group = newGroup;
      
      // Recalculate positions for affected groups only
      [oldGroup, newGroup].forEach(group => {
        state.positions[group].forEach((id, index) => {
          if (state.byId[id]) {
            state.byId[id].groupPosition = index;
          }
        });
      });
      
      // Run the full position calculation to ensure global positions are correct
      let globalPositionIndex = 0;
      state.categorySequence.currentViewCategories.forEach((category) => {
        const categoryOptions = state.positions[category] || [];
        
        categoryOptions.forEach((id, index) => {
          if (state.byId[id]) {
            state.byId[id].position = globalPositionIndex;
            globalPositionIndex++;
          }
        });
      });
    },
    /**
     * Configure the category display order based on the current page
     * (organize or vote) and user-defined categories.
     */
    setPositionGroups: (state, action) => {
      const { userDefinedCategories, categoryiesHasSkip, page } = action.payload;
      
      // Create a new category sequence
      const newCategories = [...userDefinedCategories];
      
      // Handle the Skip category based on the current page
      if (categoryiesHasSkip) {
        if (page === 'organize') {
          // In organize view, Skip appears at the beginning
          newCategories.unshift("Skip");
        } else if (page === 'vote') {
          // In vote view, Skip appears at the end
          newCategories.push("Skip");
        }
      }
      
      // Ensure all categories exist in the positions dictionary
      newCategories.forEach((category: string) => {
        if (!state.positions[category]) {
          state.positions[category] = [];
        }
      });
      
      // Update the category display order
      state.categorySequence.currentViewCategories = newCategories;
    },
    /**
     * Recalculate all option positions to ensure consistency between
     * category-specific positions and global positions.
     */
    calPosition: (state) => {
      let globalPositionIndex = 0;
      
      // Process each category in the current view order
      state.categorySequence.currentViewCategories.forEach((category) => {
        const categoryOptions = state.positions[category] || [];
        
        // Update positions for each option in this category
        categoryOptions.forEach((optionId, index) => {
          if (state.byId[optionId]) {
            // Update category-specific position
            state.byId[optionId].groupPosition = index;
            
            // Update global position across all categories
            state.byId[optionId].position = globalPositionIndex;
            globalPositionIndex++;
          }
        });
      });
    },
    /**
     * Merge options from a source category into a target category.
     * Used during transitions between organization and voting phases.
     */
    mergeOptionGroups: (state, action) => {
      const { target, source } = action.payload;
      
      // Ensure both categories exist
      if (!state.positions[target]) {
        state.positions[target] = [];
      }
      
      if (!state.positions[source]) {
        state.positions[source] = [];
      }
      
      // Get the options to merge
      const sourceOptions = [...state.positions[source]];
      
      // Add all options from source to target
      state.positions[target] = [...state.positions[target], ...sourceOptions];
      
      // Update the group property for all moved options
      sourceOptions.forEach((optionId) => {
        if (state.byId[optionId]) {
          state.byId[optionId].group = target;
        }
      });
      
      // Clear the source category
      state.positions[source] = [];
      
      // Recalculate positions to ensure consistency
      let globalPositionIndex = 0;
      state.categorySequence.currentViewCategories.forEach((category) => {
        const categoryOptions = state.positions[category] || [];
        
        categoryOptions.forEach((id, index) => {
          if (state.byId[id]) {
            state.byId[id].groupPosition = index;
            state.byId[id].position = globalPositionIndex;
            globalPositionIndex++;
          }
        });
      });
    },
    reorderOptions: (state, action) => {
      // this reducer takes in a payload: curCategory to indicate which group to reorder
      const { byId, positions } = state;
      const { curCategory } = action.payload;
      
      // console.log("current category: ", positions[curCategory]);
      // there are two things to update: 
      // the position of each option under byId. This position is a global position
      // the sequence within each position, under potions[category]

      // Let's update the category first
      // since se now only consider the given category, we only need to recreate the positions for that category
      const tmpPostiion: IQsOption[] = [];

      // first retireve all the options in the given category
      // and sort them based on the number of votes
      // if votes are tied, then the option with the smaller position will be placed first
      // this position is the global position that is stored in the byId dictionary

      Object.keys(byId).forEach((key: string) => {
        if (byId[key].group === curCategory) {
          tmpPostiion.push(byId[key]);
        }
      });

      tmpPostiion.sort(
        (a, b) => {
          const optionA = byId[a.optionId];
          const optionB = byId[b.optionId];
          if (optionA.votes === optionB.votes) {
            if (optionA.position === optionB.position) {
              return optionA.optionId.localeCompare(optionB.optionId);
            } else {
              return optionA.position - optionB.position;
            }
          } else {
            return optionB.votes - optionA.votes;
          }
        }
      );

      // now we replace the positions in the positions dictionary with the new positions
      state.positions[curCategory] = tmpPostiion.map((option) => option.optionId);

      // now we update the global position of the options in the byId dictionary
      // We only need to update the options in the given category
      // lets first optain the positions of the old options in the given category in the byId dictionary
      const oldPositions = positions[curCategory].map((optionId) => byId[optionId].position);
      const oldGroupPositions = positions[curCategory].map((optionId) => byId[optionId].groupPosition);
      // now sort the old positions in ascending order
      oldPositions.sort((a, b) => a - b);

      // now based on the new positions, we update the global position of the options in the byId dictionary
      tmpPostiion.forEach((option, index) => {
        state.byId[option.optionId].position = oldPositions[index];
        state.byId[option.optionId].groupPosition = oldGroupPositions[index];
      });
    },
    regroupAndOrderOptions: (state, action) => {
      // this reducer will not take payload
      const { byId, positions } = state;
      const { curCategory } = action.payload;
      // console.log(state.positions[curCategory]);

      // create an empty copy of the positions dictionary
      const tmpPositions: { [key: string]: string[] } = {};
      Object.keys(positions).forEach((key: string) => {
        tmpPositions[key] = [];
      });

      // based on the current votes in each group, push them into the corresponding group in the tmpPositions dictionary
      // if votes are originally in the "undecided" group and does not have votes, they will remain in the undecided group
      // votes that are positive will be pused to the "Positive" group,
      // and negative votes will be pushed to the "Negative" group, the rest would go to the "Netural" group

      // Object.keys(byId).forEach((key: string) => {
      //   if (byId[key].group === "Undecided" && byId[key].votes === 0) {
      //     tmpPositions["Undecided"].push(key);
      //   } else if (byId[key].votes > 0) {
      //     tmpPositions["Positive"].push(key);
      //   } else if (byId[key].votes < 0) {
      //     tmpPositions["Negative"].push(key);
      //   } else {
      //     tmpPositions["Neutral"].push(key);
      //   }
      // });

      Object.keys(byId).forEach((key: string) => {
        // if (byId[key].group === "Undecided" && byId[key].votes === 0) {
      if (byId[key].group === "Neutral") {
          tmpPositions["Neutral"].push(key);
        } else if (byId[key].group === "Positive") {
          tmpPositions["Positive"].push(key);
        } else if (byId[key].group === "Negative") {
          tmpPositions["Negative"].push(key);
        } else {
          tmpPositions["Skip"].push(key);
        }
      });

      // sort the options in each group based on the votes
      // if votes are tied, then the option with the smaller position will be placed first
      // if the position is also tied, then the option with the smaller optionId will be placed first
      Object.keys(tmpPositions).forEach((key: string) => {
        tmpPositions[key].sort((a, b) => {
          const optionA = byId[a];
          const optionB = byId[b];
          if (optionA.votes === optionB.votes) {
            if (optionA.position === optionB.position) {
              return optionA.optionId.localeCompare(optionB.optionId);
            } else {
              return optionA.position - optionB.position;
            }
          } else {
            return optionB.votes - optionA.votes;
          }
        });
      });

      // based on the newly sorted option lists,
      // update the information in each option
      Object.keys(tmpPositions).forEach((key: string) => {
        tmpPositions[key].forEach((optionId: string, index: number) => {
          byId[optionId].group = key;
          byId[optionId].groupPosition = index;
        });
      });

      // update the positions dictionary
      state.positions = tmpPositions;
    },
    setOnHoverOptionID: (state, action) => {
      state.metadata.onHoverOptionId = action.payload;
    },

    clearOnHoverOptionID: (state) => {
      state.metadata.onHoverOptionId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleOptions.fulfilled, (state, action) => {
        // create a variable with type of dictionary of IQsOption initialized with empty object
        const byId: { [key: string]: IQsOption } = {};
        const initialPostions: { [key: string]: string[] } = {};
        action.payload.forEach((question: IBackendQuestion) => {
          let currQuestionId = question._id;

          // Skip if question doesn't have options
          if (!question.options || !Array.isArray(question.options)) {
            return;
          }
          
          // create a list of integers from 0 to the length of the options array
          const positions = Array.from(
            { length: question.options.length },
            (_, index) => index
          );
          positions.sort(() => Math.random() - 0.5);

          question.options.forEach((option, _) => {
            const placePosition = positions.shift()!;
            const tempQsOption: IQsOption = {
              optionId: option.optionId,
              description: option.description,
              optionName: option.optionName,
              questionId: currQuestionId,
              group: "Undecided",
              votes: 0,
              position: placePosition,
            };

            byId[option.optionId] = tempQsOption;
            // place tempQsOption.optionId into the postions dictionary based on group and insert it into the index positon of an empt array
            if (initialPostions[tempQsOption.group] === undefined) {
              initialPostions[tempQsOption.group] = [];
            }
            initialPostions[tempQsOption.group].splice(
              tempQsOption.position,
              0,
              tempQsOption.optionId
            );
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
  },
});

export const {
  resetQsOptions,
  mergeOptionGroups,
  reorderOptions,
  regroupAndOrderOptions,
  initQsOptions,
  updateOptionVotes,
  addOneVoteToAllOptionsByOptionKeys,
  updateOptionPosition,
  clearAllOptionVotesByOptionKeys,
  updateOptionGroup,
  createCategories,
  setPositionGroups,
  calPosition,
  setOnHoverOptionID,
  clearOnHoverOptionID
} = optionsSlice.actions;

export {
  fetchSurveyResponseByUUID,
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse
};

export default optionsSlice;