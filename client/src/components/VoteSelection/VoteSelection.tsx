import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../app/store";
import { qvSetVotes } from "../../features/unifiedResponsesSlice";
import Select from "react-select";
import WheelDesign from "./WheelDesign";
import "./Dropdown.css";
import { formatQvVote, resolveQvLabels, ResolvedQvLabels } from "../../i18n/qvLabels";

interface VoteSelectionProps {
  designType: "Wheel" | "Drop";
  questionId: string;
  currVote: number;
  optionId: string;
  totalCredits: number;
  currCost: number;
  onMenuClose?: () => void;
  onSelectionComplete?: () => void; // Add this line
  qvLabels?: ResolvedQvLabels;
  // When set, restrict the selectable votes by sign: "positive" hides downvotes
  // (keeps 0 + upvotes), "negative" hides upvotes (keeps 0 + downvotes). When
  // null/undefined the full upvote / no-vote / downvote range is shown.
  allowedVoteSign?: "positive" | "negative" | null;
  // When true, grey out (but still allow) votes that would push the total cost
  // over the remaining budget.
  markOverBudgetVotes?: boolean;
}

const createDropdownOptions = (currCost: number) => {
  const maxVote = Math.floor(Math.sqrt(Math.abs(currCost)));
  const options = [];
  for (let i = -maxVote; i <= maxVote; i++) {
    options.push(i);
  }
  return options.reverse();
};

const renderDropdownOptions = (
  voteOptions: number[],
  labels: ResolvedQvLabels,
  // Optional predicate: returns true when picking this vote would exceed the
  // remaining budget. Over-budget options are greyed (but still selectable).
  isOverBudget?: (vote: number) => boolean,
) => {
  // based on the numbers, return a list of options that contains
  // objects with "value" and "label" properties

    return voteOptions.map((voteOption) => {
        let voteCount = voteOption * voteOption;
        const voteText = formatQvVote(voteOption, labels.aliases);
        const overBudget = isOverBudget ? isOverBudget(voteOption) : false;
        return {
          "value": voteOption,
          "label": <div className={`select-dropdown-label${overBudget ? " over-budget" : ""}`}>
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
  const labels = useMemo(() => props.qvLabels || resolveQvLabels(), [props.qvLabels]);
  const dispatch = useDispatch<AppDispatch>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Only show possible options
  // const votingOptions = createDropdownOptions(props.currVote, props.totalCredits-props.currCost);

  // Show all options
  const votingOptions = useMemo(() => {
    const all = createDropdownOptions(props.totalCredits);
    if (props.allowedVoteSign === "positive") {
      // No-vote (0) + upvotes only.
      return all.filter((vote) => vote >= 0);
    }
    if (props.allowedVoteSign === "negative") {
      // No-vote (0) + downvotes only.
      return all.filter((vote) => vote <= 0);
    }
    return all;
  }, [props.totalCredits, props.allowedVoteSign]);

  // Cost already committed by every OTHER option (this option's current vote is
  // refunded before we test a candidate vote's cost).
  const budgetBaseCost = props.currCost - props.currVote * props.currVote;
  const isVoteOverBudget = (vote: number) =>
    props.markOverBudgetVotes === true &&
    budgetBaseCost + vote * vote > props.totalCredits;
  const [selectedDropdownOption, setSelectedDropdownOption] = useState(
    renderDropdownOptions(votingOptions, labels).find(
      (obj) => obj.value === props.currVote
    )
  );
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"auto" | "top">("auto");
  const dropDownMenuRef = useRef(null);

  const chooseMenuPlacement = () => {
    if (typeof window === "undefined" || !containerRef.current) {
      return "auto";
    }
    const rect = containerRef.current.getBoundingClientRect();
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize || "16",
    );
    const menuHeight = rootFontSize * 20;
    const nav = document.querySelector(".nav-panel") as HTMLElement | null;
    const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    if (rect.bottom + menuHeight + rootFontSize > navTop) {
      return "top";
    }
    return "auto";
  };
  useEffect(() => {
    setSelectedDropdownOption(
      renderDropdownOptions(votingOptions, labels).find(
        (obj) => obj.value === props.currVote
      )
    );
  }, [labels, props.currVote, votingOptions]);

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
        qvLabels={labels}
      ></WheelDesign>
    );
  } else
    return (
      <div 
        className="select-dropdown-container"
        ref={containerRef}
        onClick={() => {
          if (!menuIsOpen) {
            setMenuPlacement(chooseMenuPlacement());
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
          menuPlacement={menuPlacement}
          onMenuOpen={onMenuOpen}
          value={selectedDropdownOption}
          options={renderDropdownOptions(votingOptions, labels, isVoteOverBudget)}
          onChange={handleDropdownChange}
          onMenuClose={() => {
            setMenuIsOpen(false);
            props.onMenuClose?.();
          }}
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
