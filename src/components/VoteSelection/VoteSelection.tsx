// import { DropdownDesign } from "./DropdownDesign";
// import { DropdownDesign } from "./DropdownDesign";
import React, { useState } from "react";
import { updateOptionField, updateOptionVotes } from "../../features/qvOptionsSlice";
import { updateQuestionFields } from "../../features/questionsSlice";
import { useDispatch } from 'react-redux';

interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    currVote: number;
    optionId: string;
    totalCredits: number;
    currCost: number;
}

const createDropdownOptions = (currentVote: number, currCost: number) => {
    console.log(currentVote, currCost)
    const maxVote = Math.floor(Math.sqrt(Math.pow(currentVote, 2) + currCost));
    const options = [];
    for (let i = -maxVote; i <= maxVote; i++) {
        options.push(i);
    }
    return options.reverse();
};

const renderDropdownOptions = (voteOptions: number[]) => {
    return voteOptions.map((voteOption, index) => (
        <option key={voteOption + '-idx' + index} value={voteOption}>
            {voteOption} votes
        </option>
    ));
};

const updateQvOption = (dispatch: any, optionId: string, newVote: number) => {
    console.log('updateOption', optionId, newVote)
    // this should be updated 
    // to prevent different questions with the same optionID
    dispatch(
        updateOptionVotes({optionId, newVote})
    );
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
    const votingOptions = createDropdownOptions(props.currVote, props.totalCredits-props.currCost);
    const [selectedOption, setSelectedOption] = useState(props.currVote);

    const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVote = Number(e.target.value);
        updateQvOption(dispatch, props.optionId, newVote);
        setSelectedOption(newVote);
    };

    return (
        <select value={selectedOption} onChange={handleOptionChange}>
            {renderDropdownOptions(votingOptions)}
        </select>
    );
};