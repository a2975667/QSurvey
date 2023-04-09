import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IQuestion, IQvOption, IQvOptionsSlice } from "../types/coreTypes";
import { API_PREFIX } from "../congif";
import { IBackendQuestion } from "../types/backendTypes";

const initialState: IQvOptionsSlice = {
  loaded: false,
  byId: {},
  positions: {},
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
    initQvOptions: (state, action) => {
      // BUG: this will break for multiple questions.
      // BUG: replace it with list of questions
      // List order of keys in action.payload.byId
      const questionSequence = Object.keys(action.payload.byId);

      // create a variable with type of dictionary of IQvOption initialized with empty object
      const byId: { [key: string]: IQvOption } = {};
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

          const tempQvOption: IQvOption = {
            optionId: option.optionId,
            description: option.description,
            optionName: option.optionName,
            questionId: questionId,
            group: "Undecided",
            votes: 0,
            position: placePosition,
          };
          byId[option.optionId] = tempQvOption;

          // console.log(initialPostions);

          // create an empty list if tempQvOption.optionId's group is not in the postions dictionary
          if (initialPostions[tempQvOption.group] === undefined) {
            initialPostions[tempQvOption.group] = [];
          }

          // insert the tempQvOption.optionId into the empty list based on the placePosition as the index of the list
          initialPostions[tempQvOption.group].splice(
            tempQvOption.position,
            0,
            tempQvOption.optionId
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
    updateOptionPosition: (state, action) => {
      const { optionId, originalCategory, newCategory, newPosition } =
        action.payload;

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
        state.positions[originalCategory] = state.positions[
          originalCategory
        ].filter((id) => id !== optionId);
      }

      state.byId[optionId].group = newCategory;
      state.byId[optionId].position = newPosition;
    },
    updateOptionVotes: (state, action) => {
      // console.log(action.payload);
      const { optionId, newVote } = action.payload;
      state.byId[optionId].votes = newVote;
    },
    clearAllOptionVotesByOptionKeys: (state, action) => {
      const { optionKeys } = action.payload;
      optionKeys.forEach((keys: string) => {
        state.byId[keys].votes = 0;
      });
    },
    addOneVoteToAllOptionsByOptionKeys: (state, action) => {
      const { optionKeys } = action.payload;
      optionKeys.forEach((keys: string) => {
        state.byId[keys].votes += 1;
      });
    },
    updateOptionGroup: (state, action) => {
      const { optionId, newGroup } = action.payload;
      const oldGroup = state.byId[optionId].group;

      // remove the option from its old position in the old group array
      state.positions[oldGroup] = state.positions[oldGroup].filter(
        (id) => id !== optionId
      );

      // insert or append the option to the new group array
      if (oldGroup === "Undecided" && newGroup === "Undecided") {
        state.positions[newGroup].push(optionId);
        state.byId[optionId].groupPosition =
          state.positions[newGroup].length - 1;
      } else {
        state.positions[newGroup].unshift(optionId);
        state.byId[optionId].groupPosition = 0;
      }

      // update the group position of all the other options in the affected group
      state.positions[oldGroup].forEach((id, index) => {
        state.byId[id].groupPosition = index;
      });

      state.positions[newGroup].forEach((id, index) => {
        state.byId[id].groupPosition = index;
      });

      // update the option itself
      state.byId[optionId].group = newGroup;
    },
    setPositionGroups: (state, action) => {
      // console.log(action.payload);
      const { positions } = action.payload;
      positions.forEach((position: string) => {
        state.positions[position] = [];
      });
    },
    mergeOptionGroups: (state, action) => {
      // action will pass in two group: target and source. The source group will be merged into the target group.      
      const { target, source } = action.payload;

      // merge the two groups together
      state.positions[target] = state.positions[target].concat(
        state.positions[source]
      );

      // update the group of each option in the merged group, the overall position, and the group position
      state.positions[target].forEach((id, index) => {
        state.byId[id].group = target;
        state.byId[id].position = index;
        state.byId[id].groupPosition = index;
      });
    },
    reorderOptions: (state, action) => {
      // this reducer will not take payload
      const { byId, positions } = state;
      const { curCategory } = action.payload;
      console.log("current category: ", state.positions[curCategory]);

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
        if (key === curCategory) {
          console.log("key = ", key, "curCategory = ", curCategory)
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
        }
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
    regroupAndOrderOptions: (state, action) => {
      // this reducer will not take payload
      const { byId, positions } = state;
      const { curCategory } = action.payload;
      console.log(state.positions[curCategory]);

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
          const positions = Array.from(
            { length: question.options.length },
            (_, index) => index
          );
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
            initialPostions[tempQvOption.group].splice(
              tempQvOption.position,
              0,
              tempQvOption.optionId
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
  mergeOptionGroups,
  reorderOptions,
  regroupAndOrderOptions,
  initQvOptions,
  updateOptionVotes,
  addOneVoteToAllOptionsByOptionKeys,
  updateOptionPosition,
  clearAllOptionVotesByOptionKeys,
  updateOptionGroup,
  createCategories,
  setPositionGroups,
} = optionsSlice.actions;

export default optionsSlice;
