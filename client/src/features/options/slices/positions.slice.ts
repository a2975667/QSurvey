import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IQuestion, IQsOption } from "../../../types/coreTypes";
import { 
  IPositionsState,
  IUpdateOptionPositionPayload,
  IUpdateOptionGroupPayload,
  ISetPositionGroupsPayload,
  IMergeOptionGroupsPayload,
  IReorderOptionsPayload,
  IRegroupAndOrderOptionsPayload
} from "../types/options.types";
import { fetchSampleOptions } from "../api/options.api";

const initialState: IPositionsState = {
  byId: {},
  positions: {}, // This gets stored at the top level in the combined state
  categorySequence: {
    hasUndecided: true,
    hasSkip: true,
    userDefinedCategories: [],
    currentViewCategories: [],
  }
};

const positionsSlice = createSlice({
  name: "options/positions",
  initialState,
  reducers: {
    /**
     * Initialize options from questions data
     */
    initQsOptions: (state, action) => {
      // List order of keys in action.payload.byId
      const questionSequence = Object.keys(action.payload.byId);
      
      // Create dictionaries for byId and positions
      const byId: { [key: string]: IQsOption } = {};
      const initialPositions: { [key: string]: string[] } = {};

      // Process each question
      questionSequence.forEach((questionId: string) => {
        const currQuestion: IQuestion = action.payload.byId[questionId];
        
        // Create randomized positions for options
        const positions = Array.from(
          { length: currQuestion.rawOptions!.length },
          (_, index) => index
        );
        positions.sort(() => Math.random() - 0.5);
        
        // Process each option
        currQuestion.rawOptions!.forEach((option) => {
          const placePosition = positions.shift()!;
          
          // Create option object
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
          
          // Add to positions
          if (initialPositions[tempQsOption.group] === undefined) {
            initialPositions[tempQsOption.group] = [];
          }
          
          initialPositions[tempQsOption.group].splice(
            tempQsOption.position,
            0,
            tempQsOption.optionId
          );
        });
      });
      
      // Update state
      state.positions = initialPositions;
      state.byId = byId;
    },
    
    /**
     * Create new categories
     */
    createCategories: (state, action) => {
      const { selfDefinedCategories } = action.payload;
      selfDefinedCategories.forEach((category: string) => {
        state.positions[category] = [];
      });
    },
    
    /**
     * Update an option's position by moving it from one category to another
     * or repositioning it within the same category.
     */
    updateOptionPosition: (state, action: PayloadAction<IUpdateOptionPositionPayload>) => {
      const { optionId, originalCategory, newCategory, newPosition } = action.payload;
      
      // Remove from original category
      if (state.positions[originalCategory]) {
        const oldIndex = state.positions[originalCategory].indexOf(optionId);
        if (oldIndex !== -1) {
          state.positions[originalCategory] = state.positions[originalCategory].filter(
            id => id !== optionId
          );
        }
      }
      
      // Add to new category
      if (!state.positions[newCategory]) {
        state.positions[newCategory] = [];
      }
      
      state.positions[newCategory].splice(
        Math.min(newPosition, state.positions[newCategory].length),
        0,
        optionId
      );
      
      // Update option
      if (state.byId[optionId]) {
        state.byId[optionId].group = newCategory;
      }
      
      // Recalculate positions
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
    
    /**
     * Update an option's category/group assignment.
     */
    updateOptionGroup: (state, action: PayloadAction<IUpdateOptionGroupPayload>) => {
      const { optionId, newGroup } = action.payload;

      console.log("updateOptionGroup", optionId, newGroup);
      
      // Skip if option doesn't exist
      if (!state.byId[optionId]) {
        return;
      }
      
      const oldGroup = state.byId[optionId].group;
      
      // Skip if no change
      if (oldGroup === newGroup && !(oldGroup === "Undecided" && newGroup === "Undecided")) {
        return;
      }
      
      // Ensure groups exist
      if (!state.positions[oldGroup]) {
        state.positions[oldGroup] = [];
      }
      
      if (!state.positions[newGroup]) {
        state.positions[newGroup] = [];
      }
      
      // Remove from old group
      state.positions[oldGroup] = state.positions[oldGroup].filter(id => id !== optionId);
      
      // Add to new group
      if (oldGroup === "Undecided" && newGroup === "Undecided") {
        state.positions[newGroup].push(optionId);
      } else {
        state.positions[newGroup].unshift(optionId);
      }
      
      // Update option
      state.byId[optionId].group = newGroup;
      console.log("state.byId[optionId].group", optionId, state.byId[optionId].group);
      
      // Recalculate positions
      [oldGroup, newGroup].forEach(group => {
        state.positions[group].forEach((id, index) => {
          if (state.byId[id]) {
            state.byId[id].groupPosition = index;
          }
        });
      });
      
      // Recalculate global positions
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
     * Configure category display order
     */
    setPositionGroups: (state, action: PayloadAction<ISetPositionGroupsPayload>) => {
      const { userDefinedCategories, categoryiesHasSkip, page } = action.payload;
      
      const newCategories = [...userDefinedCategories];
      
      if (categoryiesHasSkip) {
        if (page === 'organize') {
          newCategories.unshift("Skip");
        } else if (page === 'vote') {
          newCategories.push("Skip");
        }
      }
      
      // Ensure categories exist
      newCategories.forEach((category: string) => {
        if (!state.positions[category]) {
          state.positions[category] = [];
        }
      });
      
      state.categorySequence.currentViewCategories = newCategories;
    },
    
    /**
     * Recalculate all positions
     */
    calPosition: (state) => {
      let globalPositionIndex = 0;
      
      state.categorySequence.currentViewCategories.forEach((category) => {
        const categoryOptions = state.positions[category] || [];
        
        categoryOptions.forEach((optionId, index) => {
          if (state.byId[optionId]) {
            state.byId[optionId].groupPosition = index;
            state.byId[optionId].position = globalPositionIndex;
            globalPositionIndex++;
          }
        });
      });
    },
    
    /**
     * Merge options from source to target category
     */
    mergeOptionGroups: (state, action: PayloadAction<IMergeOptionGroupsPayload>) => {
      const { target, source } = action.payload;
      
      // Ensure categories exist
      if (!state.positions[target]) {
        state.positions[target] = [];
      }
      
      if (!state.positions[source]) {
        state.positions[source] = [];
      }
      
      // Get source options
      const sourceOptions = [...state.positions[source]];
      
      // Add to target
      state.positions[target] = [...state.positions[target], ...sourceOptions];
      
      // Update options
      sourceOptions.forEach((optionId) => {
        if (state.byId[optionId]) {
          state.byId[optionId].group = target;
        }
      });
      
      // Clear source
      state.positions[source] = [];
      
      // Recalculate positions
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
    
    /**
     * Reorder options within a category
     */
    reorderOptions: (state, action: PayloadAction<IReorderOptionsPayload>) => {
      const { byId, positions } = state;
      const { curCategory } = action.payload;
      
      // Get options in category
      const tmpPosition: IQsOption[] = [];
      
      Object.keys(byId).forEach((key: string) => {
        if (byId[key].group === curCategory) {
          tmpPosition.push(byId[key]);
        }
      });
      
      // Sort by votes
      tmpPosition.sort((a, b) => {
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
      });
      
      // Update positions
      state.positions[curCategory] = tmpPosition.map((option) => option.optionId);
      
      // Get and sort old positions
      const oldPositions = positions[curCategory].map((optionId) => byId[optionId].position);
      const oldGroupPositions = positions[curCategory].map((optionId) => byId[optionId].groupPosition);
      oldPositions.sort((a, b) => a - b);
      
      // Update options
      tmpPosition.forEach((option, index) => {
        state.byId[option.optionId].position = oldPositions[index];
        state.byId[option.optionId].groupPosition = oldGroupPositions[index];
      });
    },
    
    /**
     * Regroup and order options
     */
    regroupAndOrderOptions: (state, action: PayloadAction<IRegroupAndOrderOptionsPayload>) => {
      const { byId, positions } = state;
      
      // Create new positions
      const tmpPositions: { [key: string]: string[] } = {};
      Object.keys(positions).forEach((key: string) => {
        tmpPositions[key] = [];
      });
      
      // Group options
      Object.keys(byId).forEach((key: string) => {
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
      
      // Sort options
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
      
      // Update options
      Object.keys(tmpPositions).forEach((key: string) => {
        tmpPositions[key].forEach((optionId: string, index: number) => {
          byId[optionId].group = key;
          byId[optionId].groupPosition = index;
        });
      });
      
      // Update positions
      state.positions = tmpPositions;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleOptions.fulfilled, (state, action) => {
        // Create dictionaries
        const byId: { [key: string]: IQsOption } = {};
        const initialPositions: { [key: string]: string[] } = {};
        
        // Process questions
        action.payload.forEach((question) => {
          if (!question.options || !Array.isArray(question.options)) {
            return;
          }
          
          // Create randomized positions
          const positions = Array.from(
            { length: question.options.length },
            (_, index) => index
          );
          positions.sort(() => Math.random() - 0.5);
          
          // Process options
          question.options.forEach((option) => {
            const placePosition = positions.shift()!;
            const tempQsOption: IQsOption = {
              optionId: option.optionId,
              description: option.description,
              optionName: option.optionName,
              questionId: question._id,
              group: "Undecided",
              votes: 0,
              position: placePosition,
            };
            
            byId[option.optionId] = tempQsOption;
            
            // Add to positions
            if (initialPositions[tempQsOption.group] === undefined) {
              initialPositions[tempQsOption.group] = [];
            }
            initialPositions[tempQsOption.group].splice(
              tempQsOption.position,
              0,
              tempQsOption.optionId
            );
          });
        });
        
        // Update state
        state.positions = initialPositions;
        state.byId = byId;
      });
  },
});

export const {
  initQsOptions,
  createCategories,
  updateOptionPosition,
  updateOptionGroup,
  setPositionGroups,
  calPosition,
  mergeOptionGroups,
  reorderOptions,
  regroupAndOrderOptions,
} = positionsSlice.actions;

export default positionsSlice.reducer;