// import { DropdownDesign } from "./DropdownDesign";
// import { DropdownDesign } from "./DropdownDesign";
import React, { useState } from "react";
import { updateOptionField } from "../../features/qvOptionsSlice";
import { updateQuestionFields } from "../../features/questionsSlice";
import { useDispatch } from 'react-redux';

interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    currVote: number;
    optionID: string
    remainingCredit: number
    questionID: string
}

const createDropdownOptions = (currentVote: number, remainingCredits: number) => {
    console.log(currentVote, remainingCredits)
    const maxVote = Math.floor(Math.sqrt(Math.pow(currentVote, 2) + remainingCredits));
    const options = [];
    for (let i = -maxVote; i <= maxVote; i++) {
        options.push(i);
    }
    return options;
};

const renderDropdownOptions = (options: number[]) => {
    return options.map((option) => (
        <option key={option} value={option}>
            {option}
        </option>
    ));
};

const updateOption = (dispatch: any, optionID: string, questionID: string, newVote: number) => {
    console.log('updateOption', optionID, questionID, newVote)
    // dispatch(
    //     updateOptionField({optionID, questionID,newVote,})
    // );
};

const updateRemainingCredit = (dispatch: any, questionID: string, newCredit: number) => {
    console.log('updateRemainingCredit', questionID, newCredit)
    // dispatch(
    //     updateQuestionFields({
    //         questionID,
    //         newCredit,
    //     })
    // );
};

export const VoteSelection = (props: VoteSelectionProps) => {
    const dispatch = useDispatch();
    const options = createDropdownOptions(props.currVote, props.remainingCredit);
    const [selectedOption, setSelectedOption] = useState(props.currVote);

    const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newOption = Number(e.target.value);
        const newRemainingCredit = props.remainingCredit - Math.pow(newOption - props.currVote, 2);
        console.log(newOption)
        setSelectedOption(newOption);
        updateOption(dispatch, props.optionID, props.questionID, newOption);
        updateRemainingCredit(dispatch, props.questionID, 30);
    };

    return (
        <select value={selectedOption} onChange={handleOptionChange}>
            {renderDropdownOptions(options)}
        </select>
    );
};