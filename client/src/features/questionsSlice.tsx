import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_PREFIX } from "../config";
import { IBackendQuestion } from "../types/backendTypes";
import { IQuestion } from "../types/coreTypes";

interface IQuestionSlice {
  loaded: Boolean;
  loadedSurveyId?: string;
  order: string[];
  byId: {
    [key: string]: IQuestion;
  }
}

export const fetchSampleQuestions = createAsyncThunk<IBackendQuestion[], string>(
  "questions/fetchSampleQuestions",
  async (surveyKey) => {
    try {
      console.log('Fetching survey data from:', API_PREFIX + '/surveys/' + surveyKey);
      const response = await fetch(API_PREFIX + '/surveys/' + surveyKey);
      const data = await response.json();
      console.log('Survey data response:', data);
      console.log('Questions array:', data.questions);
      
      if (data.questions && Array.isArray(data.questions)) {
        // Check first question for debugging
        if (data.questions.length > 0) {
          const firstQuestion = data.questions[0];
          console.log('First question:', firstQuestion);
          if (firstQuestion.options) {
            console.log('First question has options:', firstQuestion.options.length);
          } else {
            console.log('First question has no options array');
          }
        }
      } else {
        console.warn('No questions array found in response data:', data);
      }
      
      return data.questions || [];
    } catch (error) {
      console.error('Error fetching survey questions:', error);
      throw error;
    }
  }
);

const initialState: IQuestionSlice = {
  loaded: false,
  loadedSurveyId: undefined,
  order: [],
  byId: {}
}

const questionsSlice = createSlice({
  name: "questions",
  initialState,
  reducers: {
    initQuestionOptionsByQuestionID: (state, action) => {
      const { questionID, options } = action.payload;
      state.byId[questionID].options = options;
    },
    clearQuestionsState: (state) => {
      state.loaded = false;
      state.loadedSurveyId = undefined;
      state.order = [];
      state.byId = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSampleQuestions.fulfilled, (state, action) => {
        const tmpQuestionSlice: IQuestionSlice = {
          loaded: false,
          loadedSurveyId: action.meta?.arg,
          order: [],
          byId: {}
        }

        // Add null checks for action.payload and ensure safe access to properties
        if (Array.isArray(action.payload)) {
          action.payload.forEach((question: IBackendQuestion, index: number) => {
            try {
              // Ensure question has all required properties
              if (!question || !question._id) {
                console.warn('Invalid question data', question);
                return; // Skip this invalid question
              }
              
              const questionType =
                question.type ||
                (question.setting && (question.setting as any).questionType) ||
                'unknown';

              // Create base question properties
              let tmpQuestion: IQuestion = {
                question: question.question || '',
                questionId: question._id,
                description: question.description || '',
                type: questionType,
                status: "Incomplete",
                position: index,
              };
              
              // Add type-specific properties
              if (questionType === 'likert') {
                // Handle Likert question type
                tmpQuestion = {
                  ...tmpQuestion,
                  scale: question.scale || ['1', '2', '3', '4', '5'],
                  minLabel: question.minLabel,
                  maxLabel: question.maxLabel,
                  groupId: question.groupId
                };
              } else if (questionType === 'text') {
                // Handle Text question type
                tmpQuestion = {
                  ...tmpQuestion,
                  multiline: question.multiline || false,
                  maxLength: question.maxLength,
                  groupId: question.groupId
                };
              } else {
                // Default to QV/QS question type
                if (!Array.isArray(question.options)) {
                  console.warn('Skipping question without options array', question);
                  return;
                }

                tmpQuestion = {
                  ...tmpQuestion,
                  rawOptions: question.options || [],
                  options: Array.isArray(question.options) 
                    ? question.options.map(option => option?.optionId || '')
                    : [],
                  totalCredits: question.setting?.totalCredits || 0,
                };
              }
              const questionId = question._id;
              tmpQuestionSlice.byId[questionId] = tmpQuestion;
              tmpQuestionSlice.order.push(questionId);
            } catch (e) {
              console.error('Error processing question', e, question);
            }
          });
        } else {
          console.warn('Expected array of questions but received', action.payload);
        }

        // update the inital state with tmpQuestionSlice
        state.byId = tmpQuestionSlice.byId;
        state.order = tmpQuestionSlice.order;
        state.loaded = true;
        state.loadedSurveyId = action.meta?.arg;
      })
      .addCase(fetchSampleQuestions.rejected, (state, action) => {
        state.loaded = false;
      })
      .addCase(fetchSampleQuestions.pending, (state, action) => {
        state.loaded = false;
        state.loadedSurveyId = action.meta?.arg;
      });
  },
});

// export const { updateQuestionByquestionID, updateQuestionStatusByQuestionID } = questionsSlice.actions;
export const { initQuestionOptionsByQuestionID, clearQuestionsState } = questionsSlice.actions;

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
