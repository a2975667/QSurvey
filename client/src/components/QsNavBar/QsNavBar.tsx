import React, { useState, useEffect } from "react";
import { surveyTelemetry } from "../../app/store";
import { IQsOption } from "../../types/coreTypes";
import "./QsNavBar.css";

interface QsNavBarProps {
  totalCredits: number;
  currCost: number;
  optionList: { [key: string]: IQsOption };
  currentView?: "welcome" | "organize" | "vote" | "selection";
  onNextClick?: () => void;
  onPreviousClick?: () => void;
  organizeBackLabel?: string;
  isTextMode?: boolean;
  showConfirmation?: boolean;
  voteCtaMode?: 'submit' | 'next';
  voteCtaLabel?: string;
  voteBackLabel?: string;
  onPrimaryAction?: () => Promise<void> | void;
  // Optional unified submission status (e.g., 'duplicate') to drive UI
  submissionStatus?: string;
  // Optional actions for duplicate submission UI
  onStartNewResponse?: () => void;
  onCloseSurvey?: () => void;
}

export const QsNavBar = ({
  totalCredits,
  currCost,
  optionList,
  currentView = "vote",
  onNextClick,
  onPreviousClick,
  organizeBackLabel,
  isTextMode = false,
  showConfirmation = false,
  voteCtaMode = 'submit',
  voteCtaLabel,
  voteBackLabel,
  onPrimaryAction,
  submissionStatus,
  onStartNewResponse,
  onCloseSurvey,
}: QsNavBarProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handlePrimaryClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!onPrimaryAction || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await onPrimaryAction();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine which controls to show based on current view
  const showSubmitButton = currentView === "vote";
  const showCredits = currentView === "vote";
  
  // Define sections based on currentView
  const getLeftSection = () => {
    if (currentView === "welcome") {
      return null; // Empty for welcome screen
    } else if (currentView === "organize") {
      if (!onPreviousClick) return null;
      const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent event bubbling
        onPreviousClick();
        try {
          surveyTelemetry.log({ kind: 'click', target: 'nav.prev', detail: { view: 'organize' } });
        } catch {}
      };
      
      return (
        <button 
          className="nav-button" 
          onClick={handlePrevClick}
        >
          {organizeBackLabel || "← Instructions"}
        </button>
      );
    } else if (currentView === "vote") {
      // Hide the button entirely when there's no handler (e.g., QVPlus round-2 vote
      // where the parent intentionally provides no onPreviousClick to enforce
      // forward-only navigation across rounds).
      if (!onPreviousClick) return null;
      const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onPreviousClick();
        try {
          surveyTelemetry.log({ kind: 'click', target: 'nav.prev', detail: { view: 'vote' } });
        } catch {}
      };

      return (
        <button
          className="nav-button"
          onClick={handlePrevClick}
        >
          {voteBackLabel || (isTextMode ? "← Welcome" : "← Organization")}
        </button>
      );
    } else if (currentView === "selection") {
      const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (onPreviousClick) onPreviousClick();
      };
      return (
        <button
          className="nav-button"
          onClick={handlePrevClick}
          disabled={!onPreviousClick}
        >
          ← Vote
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
      const isDuplicate = submissionStatus === 'duplicate' || /duplicate/i.test(error || '');
      return (
        <div className="credit-display">
          <span id="credit-amount" className="credit-amount">${remainingCredit}</span>
          <span className="credit-label">Remaining Credits</span>
          {remainingCredit < 0 && (
            <div className="nav-panel-hint-message">Credit not sufficient</div>
          )}
          {!isDuplicate && error && (
            <div className="nav-panel-hint-message error">{error}</div>
          )}
          {isDuplicate && (
            <div className="nav-panel-hint-message error">
              <div>It seems like you have submitted the survey somewhere else</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="nav-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartNewResponse?.();
                  }}
                >
                  Submit new response to the survey
                </button>
                <button
                  className="nav-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSurvey?.();
                  }}
                >
                  Close this survey
                </button>
              </div>
            </div>
          )}
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
        try {
          surveyTelemetry.log({ kind: 'click', target: 'nav.begin', detail: { view: 'welcome' } });
        } catch {}
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
        try {
          surveyTelemetry.log({ kind: 'click', target: 'nav.next', detail: { view: 'organize' } });
        } catch {}
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
      const handlePrimary = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onPrimaryAction) {
          handlePrimaryClick(e);
          try {
            surveyTelemetry.log({ kind: 'click', target: 'vote.primary', detail: { mode: voteCtaMode } });
          } catch {}
        } else if (onNextClick) {
          e.stopPropagation();
          onNextClick();
          try {
            surveyTelemetry.log({ kind: 'click', target: 'nav.next', detail: { view: 'vote' } });
          } catch {}
        }
      };

      const primaryLabel = voteCtaLabel || (voteCtaMode === 'next' ? 'Next Question →' : 'Submit');

      return (
        <button
          className={`${voteCtaMode === 'next' ? 'nav-button primary' : 'submit-button'} ${remainingCredit >= 0 ? '' : 'invalid'} ${isSubmitting ? 'disabled' : ''}`}
          onClick={handlePrimary}
          disabled={(remainingCredit < 0 && voteCtaMode !== 'next') || isSubmitting || (!onPrimaryAction && !onNextClick)}
        >
          {isSubmitting ? 'Submitting...' : primaryLabel}
        </button>
      );
    } else if (currentView === "selection") {
      const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (onNextClick) onNextClick();
      };
      return (
        <button
          className="nav-button primary"
          onClick={handleNext}
          disabled={!onNextClick}
        >
          Next →
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
      
    </div>
  );
};

export default QsNavBar;
