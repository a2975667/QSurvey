import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_PREFIX } from "../config";
import { IBackendQuestion } from "../types/backendTypes";
import { IQuestion } from "../types/coreTypes";

interface IQuestionSlice {
  loaded: Boolean;
  byId: {
    [key: string]: IQuestion;
  }
}

export const fetchSampleQuestions = createAsyncThunk<IBackendQuestion[], string>(
  "questions/fetchSampleQuestions",
  async (surveyKey) => {
    const response = await fetch(API_PREFIX + '/surveys/' + surveyKey);
    const data = await response.json();
    return data.questions;
  }
);

const initialState: IQuestionSlice = {
  loaded: false,
  byId: {}
}

const questionsSlice = createSlice({
  name: "questions",
  initialState,
  reducers: {
    initQuestionOptionsByQuestionID: (state, action) => {
      const { questionID, options } = action.payload;
      state.byId[questionID].options = options;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleQuestions.fulfilled, (state, action) => {
        const tmpQuestionSlice: IQuestionSlice = {
          loaded: false,
          byId: {}
        }

        action.payload.forEach((question: IBackendQuestion, index: number) => {
          const tmpQuestion: IQuestion = {
            question: question.question,
            questionId: question._id,
            description: question.description,
            type: question.type,
            rawOptions: question.options,
            options: question.options.map((option) => option.optionId),
            status: "Incomplete",
            totalCredits: question.setting.totalCredits,
            position: index,
          }
          tmpQuestionSlice.byId[question._id] = tmpQuestion;
        });

        // update the inital state with tmpQuestionSlice
        state.byId = tmpQuestionSlice.byId;

        // note that the sequence of the questionId is not preserved. Thus, we need to keep a list of question ID
        state.loaded = true;
      })
      .addCase(fetchSampleQuestions.rejected, (state, action) => {
        state.loaded = false;
      })
      .addCase(fetchSampleQuestions.pending, (state, action) => {
        state.loaded = false;
      });
  },
});

// export const { updateQuestionByquestionID, updateQuestionStatusByQuestionID } = questionsSlice.actions;
export const { initQuestionOptionsByQuestionID } = questionsSlice.actions;

export default questionsSlice;



// updateQuestionByquestionID: (state, action) => {
//   const { questionID, question }: { questionID: string, question: IQuestion } = action.payload;
//   state[questionID] = question;
// },
// updateQuestionStatusByQuestionID: (state, action) => {
//   const { questionID, status } = action.payload;
//   state[questionID].status = status;
// },


// addQuestion: (state, action) => {
//   const { question } = action.payload;
//   state.byId[question.questionID] = question;
//   state.allIds.push(question.questionID);
// },