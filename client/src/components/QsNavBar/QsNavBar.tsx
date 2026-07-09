import React, { useState, useEffect } from "react";
import { surveyTelemetry } from "../../app/store";
import { IQsOption } from "../../types/coreTypes";
import { resolveQvLabels, ResolvedQvLabels } from "../../i18n/qvLabels";
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
  selectionCtaLabel?: string;
  // QVPlus selection stage only: when true, show the "answer every option" hint.
  // The parent reveals it after a blocked Next click and hard-blocks in its own
  // handler, so the button itself stays enabled.
  showSelectionHint?: boolean;
  voteBackLabel?: string;
  onPrimaryAction?: () => Promise<void> | void;
  // Optional unified submission status (e.g., 'duplicate') to drive UI
  submissionStatus?: string;
  // Optional actions for duplicate submission UI
  onStartNewResponse?: () => void;
  onCloseSurvey?: () => void;
  qvLabels?: ResolvedQvLabels;
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
  selectionCtaLabel,
  showSelectionHint = false,
  voteBackLabel,
  onPrimaryAction,
  submissionStatus,
  onStartNewResponse,
  onCloseSurvey,
  qvLabels,
}: QsNavBarProps) => {
  const labels = qvLabels || resolveQvLabels();
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
          {organizeBackLabel || labels.text.organizeBackToInstructions}
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
          {voteBackLabel || (isTextMode ? labels.text.voteBackToWelcome : labels.text.voteBackToOrganization)}
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
          {labels.text.selectionBackToVote}
        </button>
      );
    }
    return null;
  };

  const getCenterSection = () => {
    if (currentView === "welcome") {
      return (
        <div className="phase-display">
          {labels.text.instructionsPhase}
        </div>
      );
    } else if (currentView === "organize") {
      return (
        <div className="phase-display">
          <div>{labels.text.organizationPhase}</div>
          {showConfirmation && (
            <div className="nav-panel-hint-message">
              {labels.text.unorganizedOptions}
            </div>
          )}
        </div>
      );
    } else if (currentView === "vote") {
      const isDuplicate = submissionStatus === 'duplicate' || /duplicate/i.test(error || '');
      return (
        <div className="credit-display">
          <span id="credit-amount" className="credit-amount">${remainingCredit}</span>
          <span className="credit-label">{labels.text.remainingCredits}</span>
          {remainingCredit < 0 && (
            <div className="nav-panel-hint-message">{labels.text.creditNotSufficient}</div>
          )}
          {!isDuplicate && error && (
            <div className="nav-panel-hint-message error">{error}</div>
          )}
          {isDuplicate && (
            <div className="nav-panel-hint-message error">
              <div>{labels.text.duplicateSubmitted}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="nav-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartNewResponse?.();
                  }}
                >
                  {labels.text.submitNewResponse}
                </button>
                <button
                  className="nav-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSurvey?.();
                  }}
                >
                  {labels.text.closeSurvey}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    } else if (currentView === "selection") {
      // Same hint styling as the organize stage's "unorganized options" nudge.
      // Only shown once the parent flags a blocked Next attempt; the hard block
      // itself lives in the parent's handler, not on the button.
      return showSelectionHint ? (
        <div className="phase-display">
          <div className="nav-panel-hint-message">
            {labels.text.requireAllSelectionsHint}
          </div>
        </div>
      ) : null;
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
          {labels.text.beginSurvey}
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
          {labels.text.votingNext}
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

      const primaryLabel = voteCtaLabel || (voteCtaMode === 'next' ? labels.text.nextQuestion : labels.text.submit);

      return (
        <button
          className={`${voteCtaMode === 'next' ? 'nav-button primary' : 'submit-button'} ${remainingCredit >= 0 ? '' : 'invalid'} ${isSubmitting ? 'disabled' : ''}`}
          onClick={handlePrimary}
          disabled={(remainingCredit < 0 && voteCtaMode !== 'next') || isSubmitting || (!onPrimaryAction && !onNextClick)}
        >
          {isSubmitting ? labels.text.submitting : primaryLabel}
        </button>
      );
    } else if (currentView === "selection") {
      const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (onNextClick) onNextClick();
      };
      return (
        <button
          className="submit-button"
          onClick={handleNext}
          disabled={!onNextClick}
        >
          {selectionCtaLabel || labels.text.qvPlusNextStep}
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
