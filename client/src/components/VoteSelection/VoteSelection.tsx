import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../app/store";
import { qvSetVotes } from "../../features/unifiedResponsesSlice";
import Select from "react-select";
import WheelDesign from "./WheelDesign";
import "./Dropdown.css";

interface VoteSelectionProps {
  designType: "Wheel" | "Drop";
  questionId: string;
  currVote: number;
  optionId: string;
  totalCredits: number;
  currCost: number;
  onSelectionComplete?: () => void; // Add this line
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
          "label": <div className="select-dropdown-label">
                     <div className="vote-label">{voteText}</div>
                     <div className="cost-label">${voteCount}</div>
                   </div>
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

const updateQvVotes = (dispatch: AppDispatch, questionId: string, optionId: string, newVote: number) => {
  try {
    dispatch(qvSetVotes({ questionId, optionId, votes: newVote }));
  } catch (error) {
    console.error("Error updating votes:", error);
  }
};

const styles = {
  control: (css: any) => ({
    ...css,
    // width: "100%",
    border: "1px solid gray",
    boxShadow: "none",
    "&:hover": {
      border: "1px solid gray",
    },
  }),
  menu: ({ width, ...css }: any) => ({
    ...css,
    width: "max-content",
    zIndex: 9999,
    overflowY: "hidden",
  }),
  menuList: (css: any) => ({
    ...css,
    maxHeight: "20em",
    // transform: 'translateY(-40%)',
    "&:-webkit-scrollbar": {
        display: "none",
      },
  }),
  option: (css: any, { data, isDisabled, isFocused, isSelected }: any) => ({
    ...css,
    height: "2em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isFocused ? "#dfdfdf" : null,
    color: "#333333",
  }),
};

export const VoteSelection = (props: VoteSelectionProps) => {
  const dispatch = useDispatch<AppDispatch>();
  // Only show possible options
  // const votingOptions = createDropdownOptions(props.currVote, props.totalCredits-props.currCost);

  // Show all options
  const votingOptions = createDropdownOptions(props.totalCredits);
  const [selectedDropdownOption, setSelectedDropdownOption] = useState(
    renderDropdownOptions(votingOptions).find(
      (obj) => obj.value === props.currVote
    )
  );
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const dropDownMenuRef = useRef(null);
  useEffect(() => {
    setSelectedDropdownOption(
      renderDropdownOptions(votingOptions).find(
        (obj) => obj.value === props.currVote
      )
    );
  }, [props.currVote]);

  const handleDropdownChange = (selected: any) => {
    if (!selected) return;
    
    const newVote = selected.value;
    updateQvVotes(dispatch, props.questionId, props.optionId, newVote);
    
    // Close the menu after selection
    setMenuIsOpen(false);
    
    if (props.onSelectionComplete) {
      props.onSelectionComplete();
    }
  };

  const onMenuOpen = () => {
    // Scroll to the selected option when menu opens
    setTimeout(() => {
      const selectedEl = document.querySelector(".select__option--is-selected");
      if (selectedEl) {
        selectedEl.scrollIntoView({
          behavior: "auto",
          block: "nearest",
          inline: "end",
        });
      }

      const parentMenu = document.querySelector(".select__menu-list");
      if (parentMenu) {
        parentMenu.scrollTop += 80; // offset by 20 pixels, adjust as needed
      }
    }, 10); // Slightly longer timeout to ensure DOM is updated
  };

  if (props.designType === "Wheel") {
    return (
      <WheelDesign
        options={votingOptions}
        optionId={props.optionId}
        questionId={props.questionId}
        currVote={props.currVote}
      ></WheelDesign>
    );
  } else
    return (
      <div 
        className="select-dropdown-container"
        onClick={() => {
          if (!menuIsOpen) {
            setMenuIsOpen(true);
            onMenuOpen();
          }
        }}
      >
        <Select
          className="select-dropdown-menu"
          classNamePrefix="select"
          ref={dropDownMenuRef}
          styles={styles}
          menuPlacement="auto"
          onMenuOpen={onMenuOpen}
          value={selectedDropdownOption}
          options={renderDropdownOptions(votingOptions)}
          onChange={handleDropdownChange}
          onMenuClose={() => setMenuIsOpen(false)}
          menuIsOpen={menuIsOpen}
          menuShouldScrollIntoView={true}
          isSearchable={false}
          // maxMenuHeight={250}
          // placeholder="Select votes..."
          menuPortalTarget={document.body} /* This forces the menu to render in a portal at the document body level */
          // menuPosition="fixed" /* This ensures the menu is positioned fixed relative to the viewport */
        />
      </div>
    );
};
