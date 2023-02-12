// import { DropdownDesign } from "./DropdownDesign";
// import { DropdownDesign } from "./DropdownDesign";
import React, { useEffect, useState } from "react";
import { updateOptionVotes } from "../../features/qvOptionsSlice";
import { useDispatch } from 'react-redux';
import { IQvOption } from "../../types/coreTypes";

// const createDropdownOptions = (currentVote: number, currCost: number) => {
//     console.log(currentVote, currCost)
//     const maxVote = Math.floor(Math.sqrt(Math.pow(currentVote, 2) + currCost));
//     const options = [];
//     for (let i = -maxVote; i <= maxVote; i++) {
//         options.push(i);
//     }
//     return options.reverse();
// };

// const renderDropdownOptions = (voteOptions: number[]) => {
//     return voteOptions.map((voteOption, index) => (
//         <option key={voteOption + '-idx' + index} value={voteOption}>
//             {voteOption} votes
//         </option>
//     ));
// };

// const updateQvOption = (dispatch: any, optionId: string, newVote: number) => {
//     console.log('updateOption', optionId, newVote)
//     // this should be updated 
//     // to prevent different questions with the same optionID
//     dispatch(
//         updateOptionVotes({optionId, newVote})
//     );
// };

export const Organizer = (options: { [key: string]: IQvOption }) => {
    console.log(options);
    // the order here matters
    const categories = ["Positive", "Negative", "Neutral", "Undecided"];
    const optionsByCategory = {
        Positive: [],
        Negative: [],
        Neutral: [],
        Undecided: []
    }
    // create a dictionary where key is one of the categories and value is a list of options
    // const addOptionsToCategories = (options: IQvOption[]) => {
    //     options.forEach((option) => {
    //         optionsByCategory[option.group].push(option);
    //     });
    // }
    
    // addOptionsToCategories(options);


    const dispatch = useDispatch();
    
    // const [selectedOption, setSelectedOption] = useState(props.currVote);

    // useEffect(() => {
    //     setSelectedOption(props.currVote);
    // }, [props.currVote]);

    // const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //     const newVote = Number(e.target.value);
    //     updateQvOption(dispatch, props.optionId, newVote);
    //     setSelectedOption(newVote);
    // };

    return (
        <h1>Here is the organizer</h1>        

        // <select value={selectedOption} onChange={handleOptionChange}>
        //     {renderDropdownOptions(votingOptions)}
        // </select>
    );
};