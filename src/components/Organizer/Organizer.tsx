import React, { useEffect, useState } from "react";
import { updateOptionGroup, updateOptionVotes } from "../../features/qvOptionsSlice";
import { useDispatch } from 'react-redux';
import { IQvOption } from "../../types/coreTypes";
import "./organizer.css";

interface OrganizerType {
    options: {[key: string]: IQvOption};
  }

export const Organizer = (props: OrganizerType) => {
    // the order here matters, the last one must be undecided.
    const selfDefinedCategories = ["Positive", "Neutral", "Negative"];
    const categories = selfDefinedCategories.concat(["Undecided"]);
    const optionsByCategory = {} as { [key: string]: IQvOption[]}

    categories.forEach(category => {
        optionsByCategory[category] = [];
    });

    Object.values(props.options).forEach(option => {
        const category = categories.includes(option.group) ? option.group : "Undecided";
        // console.log(option.optionId, category);
        // console.log(optionsByCategory);
        optionsByCategory[category].push(option);
      });


    const dispatch = useDispatch();

    const updateGroupByOptionId = (optionId: string, newGroup: string) => {
        dispatch(updateOptionGroup({ optionId, newGroup }));
    };

    const resetGroupByOptionId = (optionId: string, newGroup: string) => {
        newGroup = "Undefined";
        dispatch(updateOptionGroup({ optionId, newGroup}));
    };

    return (
        <div>
            <h1>Organizer</h1>
            <div className="container">
                {categories.slice(0, 3).map(category => (
                    <div className={`category ${category.toLowerCase()}`} key={category}>
                        <h2>{category}</h2>

                        {optionsByCategory[category].map(option => (
                            <div className="option-box" key={option.optionId}>
                                <div className="option-name">{option.optionName}</div>
                                <div className="option-buttons">
                                <button 
                                        key="Undefined"
                                        onClick={() => updateGroupByOptionId(option.optionId, "Undefined")}
                                    > Redecide
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="undecided">
                <h2>Undecided</h2>
                {optionsByCategory["Undecided"].map(option => (
                    <div className="option-box" key={option.optionId}>
                        <div className="option-name">{option.optionName}</div>
                        <div className="option-buttons">
                        {selfDefinedCategories.map(selfDefinedCategory => (
                            <button 
                                key={selfDefinedCategory}
                                onClick={() => updateGroupByOptionId(option.optionId, selfDefinedCategory)}
                            >
                                {selfDefinedCategory}
                            </button>
                        ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};




        
        

        // <select value={selectedOption} onChange={handleOptionChange}>
        //     {renderDropdownOptions(votingOptions)}
        // </select>    
    // const [selectedOption, setSelectedOption] = useState(props.currVote);

    // useEffect(() => {
    //     setSelectedOption(props.currVote);
    // }, [props.currVote]);

    // const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //     const newVote = Number(e.target.value);
    //     updateQvOption(dispatch, props.optionId, newVote);
    //     setSelectedOption(newVote);
    // };

    
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
