import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../app/store";
import { useSelector } from 'react-redux'


const updateOptionSlice = createSlice({
  name: "updateOption",
  initialState: {
    optionID: "",
    text: "",
    description: "",
    position: 0,
    group: "",
    votes: 0
  },
  reducers: {
    updateVoteCount: (state, action) => {
        const { questionIndex, optionIndex, voteCount } = action.payload;
        const questions = useSelector((state: RootState) => state.sampleSurvey.questions);
        questions[questionIndex].options[optionIndex].votes = voteCount;
        state.voteCount = voteCount;
    }
  }
});


export const { updateVoteCount } = updateOptionSlice.actions;
export default updateOptionSlice;
