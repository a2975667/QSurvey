import React, { useEffect, useState } from "react";
import { updateOptionVotes } from "../../features/qvOptionsSlice";
import { useDispatch } from 'react-redux';
import Select from "react-select";
import WheelDesign from "./WheelDesign";
import './Dropdown.css'

interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    currVote: number;
    optionId: string;
    totalCredits: number;
    currCost: number;
}

const createDropdownOptions = (currentVote: number, currCost: number) => {
    const maxVote = Math.floor(Math.sqrt(Math.pow(currentVote, 2) + currCost));
    const options = [];
    for (let i = -maxVote; i <= maxVote; i++) {
        options.push(i);
    }
    return options.reverse();
};

// const renderDropdownOptions = (voteOptions: number[]) => {
//     return voteOptions.map((voteOption, index) => (
//         <option key={voteOption + '-idx' + index} value={voteOption}>
//             {voteOption} votes
//         </option>
//     ));
// };

const renderDropdownOptions = (voteOptions: number[]) => {
    // based on the numbers, return a list of options that contains
    // objects with "value" and "label" properties

    return voteOptions.map((voteOption, index) => (
        {"value": voteOption, "label": `${voteOption} rating  $${voteOption*voteOption} votes`}
    ));
};

const updateQvOption = (dispatch: any, optionId: string, newVote: number) => {
    // this should be updated 
    // to prevent different questions with the same optionID
    dispatch(
        updateOptionVotes({optionId, newVote})
    );
};

const styles = {
    control: (css: any) => ({
    ...css,
    width: "100%"
    }),
    menu: ({ width, ...css }: any) => ({
    ...css,
    width: "max-content",
    minWidth: "50%"
    }),
    // option: (css: any) => ({ ...css, width: "max-content" }),
    };

export const VoteSelection = (props: VoteSelectionProps) => {
    const dispatch = useDispatch();
    const votingOptions = createDropdownOptions(props.currVote, props.totalCredits-props.currCost);
    const [selectedDropdownOption, setSelectedDropdownOption] = useState(renderDropdownOptions(votingOptions).find(obj => obj.value === props.currVote));

    useEffect(() => {
        setSelectedDropdownOption(renderDropdownOptions(votingOptions).find(obj => obj.value === props.currVote));
    }, [props.currVote]);

    const handleDropdownChange = (selected: any) => {
        const newVote = selected.value;
        updateQvOption(dispatch, props.optionId, newVote);
        setSelectedDropdownOption(renderDropdownOptions(votingOptions).find(obj => obj.value === props.currVote));
      };


    if (props.designType === 'Wheel'){
        return <WheelDesign options={votingOptions} optionId={props.optionId} currVote={props.currVote}></WheelDesign>
    }
    else
        return (
            <div className="select-dropdown-container">
                <Select styles={styles} 
                value={selectedDropdownOption} 
                options={renderDropdownOptions(votingOptions)} onChange={handleDropdownChange} />
            </div>
        );
};