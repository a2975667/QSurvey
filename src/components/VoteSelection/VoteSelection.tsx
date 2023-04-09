import React, { useEffect, useState, useRef } from "react";
import { updateOptionVotes } from "../../features/qvOptionsSlice";
import { useDispatch } from 'react-redux';
import Select, { ActionMeta } from "react-select";
import ValueType from "react-select";
import WheelDesign from "./WheelDesign";
import './Dropdown.css'

interface VoteSelectionProps {
    designType: 'Wheel' | 'Drop';
    currVote: number;
    optionId: string;
    totalCredits: number;
    currCost: number;
}

const createDropdownOptions = (currCost: number) => {
    const maxVote = Math.floor(Math.sqrt(Math.abs(currCost)));
    const options = [];
    for (let i = -maxVote; i <= maxVote; i++) {
        options.push(i);
    }
    return options.reverse();
};

const renderDropdownOptions = (voteOptions: number[]) => {
    // based on the numbers, return a list of options that contains
    // objects with "value" and "label" properties

    return voteOptions.map((voteOption, index) => {
        let voteType = "";
        if (voteOption > 0) {
          voteType = "upvote";
        } else if (voteOption < 0) {
          voteType = "downvote";
        } else {
          voteType = "No votes";
        }
        let voteCount = voteOption * voteOption;
        let voteText = "";
        if (Math.abs(voteOption) === 0) {
          voteText = voteType;
        } else if (Math.abs(voteOption) === 1) {
            voteText = `${Math.abs(voteOption)} ${voteType}`;
        } else {
          voteText = `${Math.abs(voteOption)} ${voteType}s`;
        }
        return {
          "value": voteOption,
          "label": <span className="select-dropdown-label">
                     <p>{voteText}</p>
                     <p>${voteCount}</p>
                   </span>
        };
      });
    // return voteOptions.map((voteOption, index) => (
    //     // `${voteOption} rating \u00A0\u00A0\u00A0\u00A0 $${voteOption*voteOption} votes`
    //     {"value": voteOption, "label": 
    //         <span className="select-dropdown-label">
    //             <p>{voteOption + (voteOption<=0?" downvotes":" upvotes")}</p>
    //             <p>${voteOption*voteOption}</p>
    //         </span>
    //     }
    // ));
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
        width: "100%",
        border: '1px solid gray',
        boxShadow: 'none',
        '&:hover': {
            border: '1px solid gray',
        }
    }),
    menu: ({ width, ...css }: any) => ({
        ...css,
        width: "max-content",
        minWidth: "100%",
        maxHeight: '150px',
        overflowY: 'hidden',
        '&:-webkit-scrollbar': {
            display: 'none',
        }
    }),
    option: (css: any, { data, isDisabled, isFocused, isSelected }: any) => ({ 
        ...css, 
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isFocused ? "#dfdfdf" : null,
        color: "#333333", 
        '&:first-child': {
            marginTop: '180px'
        }
    }),
    };

export const VoteSelection = (props: VoteSelectionProps) => {
    const dispatch = useDispatch();
    // Only show possible options
    // const votingOptions = createDropdownOptions(props.currVote, props.totalCredits-props.currCost);

    // Show all options
    const votingOptions = createDropdownOptions(props.totalCredits);
    const [selectedDropdownOption, setSelectedDropdownOption] = useState(renderDropdownOptions(votingOptions).find(obj => obj.value === props.currVote));

    const dropDownMenuRef = useRef(null)
    useEffect(() => {
        setSelectedDropdownOption(renderDropdownOptions(votingOptions).find(obj => obj.value === props.currVote));
    }, [props.currVote]);

    const handleDropdownChange = (selected: any) => {
        const newVote = selected.value;
        updateQvOption(dispatch, props.optionId, newVote);
        setSelectedDropdownOption(renderDropdownOptions(votingOptions).find(obj => obj.value === props.currVote));
      };

    const onMenuOpen = () => {
        setTimeout(()=>{
            const selectedEl = document.getElementsByClassName("select__option--is-selected")[0];
            if(selectedEl){
                selectedEl.scrollIntoView({behavior:'auto', block:'nearest', inline: 'end'});
            }
        },1);
    };


    if (props.designType === 'Wheel'){
        return <WheelDesign options={votingOptions} optionId={props.optionId} currVote={props.currVote}></WheelDesign>
    }
    else
        return (
            <div className="select-dropdown-container">
                <Select 
                className="select-dropdown-menu"
                classNamePrefix="select"
                ref={dropDownMenuRef}
                styles={styles} 
                menuPlacement='auto'
                onMenuOpen={onMenuOpen}
                value={selectedDropdownOption}
                options={renderDropdownOptions(votingOptions)}
                onChange={handleDropdownChange} />
            </div>
        );
};