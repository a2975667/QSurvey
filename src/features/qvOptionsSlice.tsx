import { createSlice } from "@reduxjs/toolkit";
import { sampleSurvey } from "../__api__/mock-api";
import { Dispatch } from 'redux';

const optionsSlice = createSlice({
    name: "options",
    initialState: {
        byId: {},
    },
    reducers: {
        setSampleOptions: (state, action) => {
            state.byId = action.payload.byId;
        },
        // update the option given field and value
        updateOptionField: (state, action) => {
            const { optionID, field, value } = action.payload;
            state.byId[optionID][field] = value;
        },



        // addOption: (state, action) => {
        //     const { option } = action.payload;
        //     state.byId[option.optionID] = option;
        //     state.allIds.push(option.optionID);
        // },
        // removeOption: (state, action) => {
        //     const { optionID } = action.payload;
        //     delete state.byId[optionID];
        //     state.allIds = state.allIds.filter(id => id !== optionID);
        // },
        // updateOption: (state, action) => {
        //     const { optionID, updates } = action.payload;
        //     state.byId[optionID] = { ...state.byId[optionID], ...updates };
        // }
    }
});

export const {setSampleOptions, updateOptionField} = optionsSlice.actions;

export const fetchSampleOptions = () => (dispatch: Dispatch) => {
    dispatch(setSampleOptions(sampleSurvey.qvOptions));
  };

export default optionsSlice;