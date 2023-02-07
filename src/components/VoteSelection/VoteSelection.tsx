// import { DropdownDesign } from "./DropdownDesign";
// import { DropdownDesign } from "./DropdownDesign";
import React, { useState } from "react";
import { updateVoteCount } from "../../features/adjustQvOptionSlice";
import { updateRemainingCredit } from "../../features/adjustQvQuestionSlice";
import { Option } from "../../pages/test-page/TestPage";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "../../app/store";

interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    currVote: number;
    option: Option;
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

export const useVoteSelection = (option: Option) => {
    const dispatch = useDispatch();
    const [selectedVote, setSelectedVote] = useState(option.votes);

    const remainingCredits = useSelector((state: RootState) => state.sampleSurvey.questions[0].remainingCredit);
    const options = createDropdownOptions(option.votes, remainingCredits);
    const state = useSelector((state: RootState) => state.sampleSurvey);

    const handleVoteSelection = (vote: number, optionID: string) => {
        const questionIndex = 0;
        const optionIndex = state.questions[questionIndex].options.findIndex((option:Option) => option.optionID === optionID);
        setSelectedVote(vote);
        dispatch(updateVoteCount({ questionIndex: 0, optionIndex: optionIndex, voteCount: vote }));
        dispatch(updateRemainingCredit({ remainingCredits: remainingCredits + (option.votes ** 2 - vote ** 2) }));
    };

    return { selectedVote, options, handleVoteSelection };
};

export const VoteSelection = (props: VoteSelectionProps) => {
    const { selectedVote, options, handleVoteSelection } = useVoteSelection(props.option);
    
    return (
        <select value={selectedVote} onChange={e => handleVoteSelection(Number(e.target.value), props.option.optionID)}>
            {options.map(option => (
                <option key={option} value={option}>
                    {option} votes, cost {option ** 2}
                </option>
            ))}
        </select>
    );
};










// const DropdownDesign = ({ remainCredits, currVotes }) => {

//     const options = createVoteOptions(remainCredits, currVotes);

//     //create hook that sets currVote
//     const [currVote, setCurrVote] = useState(0);

//     //on change selection, set currVote
//     const onSelect = (event) => {
//         setCurrVote(event.target.votes)
//         console.log('You selected ', event.target.votes)
//     }

//     return (
//         <form>
//             <select value={currVote} onChange={onSelect}>
//                 {options.map((option) => (
//                     <option key={option.index} value={option.votes}>
//                         {option.label}
//                     </option>
//                 ))}
//             </select>
//         </form>

//     )
// }

// export const VoteSelection = (props: VoteSelectionProps) => {
//     console.log(props)
//     if (props.designType === 'Wheel') {
//         return <></>
//         // return <WheelDesign remaining_credits={30}></WheelDesign>
//     } else if (props.designType === 'Drop') {
//         // return <DropdownDesign remaining_credits={30}></DropdownDesign>
//         return <DropdownDesign currVotes={props.currVote} remainCredits={30}></DropdownDesign>
//     }

//     return <></>
// }



