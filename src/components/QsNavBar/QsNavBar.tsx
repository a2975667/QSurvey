import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { AppDispatch } from "../../app/store";
import {
  clearAllOptionVotesByOptionKeys,
  addOneVoteToAllOptionsByOptionKeys,
  regroupAndOrderOptions,
} from "../../features/qsOptionsSlice";
import { IQsOption } from "../../types/coreTypes";
import { CustomButton } from "../Button/Button";
import { submitSurvey } from "./submission";
import "./QsNavBar.css";

interface QsNavBarProps {
  totalCredits: number;
  currCost: number;
  optionList: { [key: string]: IQsOption };
  currentView?: "welcome" | "organize" | "vote";
  onNextClick?: () => void;
  onPreviousClick?: () => void;
  isTextMode?: boolean;
  showConfirmation?: boolean;
}

const ResetSurvey = ({
  optionList,
}: {
  optionList: { [key: string]: IQsOption };
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const resetSurvey = () => {
    dispatch(
      clearAllOptionVotesByOptionKeys({ optionKeys: Object.keys(optionList) })
    );
  };

  return (
    <CustomButton className={"reset"} label="Reset" onClick={resetSurvey} />
  );
};

const AddOneVoteEachOption = ({
  totalCredits,
  currCost,
  optionList,
}: QsNavBarProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const addOneVoteEachOption = () => {
    var totalCreditsNeed = 0;
    const sumTotalCreditsNeed = () => {
      // Sum the votes for all options in the optionList
      totalCreditsNeed = Object.values(optionList).reduce(
        (acc, option) => acc + (option.votes + 1) * (option.votes + 1),
        0
      );
    };
    if (totalCreditsNeed <= totalCredits - currCost) {
      dispatch(
        addOneVoteToAllOptionsByOptionKeys({
          optionKeys: Object.keys(optionList),
        })
      );
    }
  };

  return (
    <CustomButton
      className={"addOneVote"}
      label="All +1 Vote"
      onClick={addOneVoteEachOption}
    />
  );
};

export const QsNavBar = ({
  totalCredits,
  currCost,
  optionList,
  currentView = "vote",
  onNextClick,
  onPreviousClick,
  isTextMode = false,
  showConfirmation = false,
}: QsNavBarProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: any) => state);
  const qsOptions = useSelector((state: any) => state.qsOptions);
  const metadata = useSelector((state: any) => state.metadata);
  const questions = useSelector((state: any) => state.questions);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorderSurvey = () => {
    dispatch(regroupAndOrderOptions({ curCategory: "all" }));
  };

  let remainingCredit = totalCredits - currCost;

  useEffect(() => {
    // Check if the remaining credit is positive and toggle the color of the submit button and color of credit
    const remainingCreditEl = document.getElementById("remainingCredit");
    if (remainingCredit > 0) {
      if (remainingCreditEl) {
        remainingCreditEl.style.color = "black";
      }
    } else {
      if (remainingCreditEl) {
        remainingCreditEl.style.color = "red";
      }
    }
  }, [remainingCredit]);

  const handleSubmit = () => {
    submitSurvey({
      optionList,
      remainingCredit,
      totalCredits,
      currCost,
      state,
      questions,
      metadata,
      qsOptions,
      dispatch,
      navigate,
      id,
      setIsSubmitting,
      setError,
    });
  };

  // Determine which controls to show based on current view
  const showSubmitButton = currentView === "vote";
  const showCredits = currentView === "vote";
  
  // Define sections based on currentView
  const getLeftSection = () => {
    if (currentView === "welcome") {
      return null; // Empty for welcome screen
    } else if (currentView === "organize") {
      const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent event bubbling
        if (onPreviousClick) onPreviousClick();
      };
      
      return (
        <button 
          className="nav-button" 
          onClick={handlePrevClick}
          disabled={!onPreviousClick}
        >
          ← Instructions
        </button>
      );
    } else if (currentView === "vote") {
      const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent event bubbling
        if (onPreviousClick) onPreviousClick();
      };
      
      return (
        <button 
          className="nav-button" 
          onClick={handlePrevClick}
          disabled={!onPreviousClick}
        >
          {isTextMode ? "← Welcome" : "← Organization"}
        </button>
      );
    }
    return null;
  };

  const getCenterSection = () => {
    if (currentView === "welcome") {
      return (
        <div className="phase-display">
          Instructions
        </div>
      );
    } else if (currentView === "organize") {
      return (
        <div className="phase-display">
          <div>Organization Phase</div>
          {showConfirmation && (
            <div className="nav-panel-hint-message">
              There are still unorganized options
            </div>
          )}
        </div>
      );
    } else if (currentView === "vote") {
      return (
        <div className="credit-display">
          <span id="credit-amount" className="credit-amount">${remainingCredit}</span>
          <span className="credit-label">Remaining Credits</span>
          {remainingCredit < 0 && (
            <div className="nav-panel-hint-message">Credit not sufficient</div>
          )}
          {error && <div className="nav-panel-hint-message error">{error}</div>}
        </div>
      );
    }
    return null;
  };

  const getRightSection = () => {
    if (currentView === "welcome") {
      const handleBeginClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent event bubbling
        if (onNextClick) onNextClick();
      };
      
      // Directly render the button without the container for the welcome screen
      return (
        <button 
          className="nav-button primary" 
          onClick={handleBeginClick}
          disabled={!onNextClick}
        >
          Begin Survey →
        </button>
      );
    } else if (currentView === "organize") {
      const handleNextClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent event bubbling
        if (onNextClick) onNextClick();
      };
      
      return (
        <button 
          className="nav-button primary" 
          onClick={handleNextClick}
          disabled={!onNextClick}
        >
          Voting →
        </button>
      );
    } else if (currentView === "vote") {
      const handleSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent event bubbling
        handleSubmit();
      };
      
      return (
        <button
          className={`submit-button ${remainingCredit >= 0 ? "" : "invalid"} ${isSubmitting ? "disabled" : ""}`}
          onClick={handleSubmitClick}
          disabled={remainingCredit < 0 || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="nav-panel">
      {/* Left section */}
      <div className="nav-section left">
        {getLeftSection()}
      </div>
      
      {/* Center section */}
      <div className="nav-section center">
        {getCenterSection()}
      </div>
      
      {/* Right section */}
      <div className="nav-section right">
        {getRightSection()}
      </div>
      
      {/* Hidden elements for potential future use */}
      <div style={{ display: 'none' }}>
        <ResetSurvey optionList={optionList} />
        <AddOneVoteEachOption
          totalCredits={totalCredits}
          currCost={currCost}
          optionList={optionList}
        />
      </div>
    </div>
  );
};

export default QsNavBar;
