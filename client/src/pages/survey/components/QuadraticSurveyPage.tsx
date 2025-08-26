import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";
import { useSearchParams } from "react-router-dom";
import { IQsOption } from "../../../types/coreTypes";
import {
  setPositionGroups,
  mergeOptionGroups,
  calPosition,
} from "../../../features/qsOptionsSlice";
import { setUKey } from "../../../features/metadataSlice";
import WelcomeView from "./WelcomeView";
import OrganizeView from "./OrganizeView";
import VotingView from "./VotingView";
import QsNavBar from "../../../components/QsNavBar";

// Props interface for the QuadraticSurveyPage
interface QuadraticSurveyPageProps {
  style: "text" | "interactive";
  inputType?: "wheel" | "dropdown";
}

// Main quadratic voting survey component
const QuadraticSurveyPage: React.FC<QuadraticSurveyPageProps> = ({
  style,
  inputType = "dropdown",
}) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get("uKey");

  // Initialize data used in this page from the Redux store
  const survey = useAppSelector((state) => state);
  const questions = Object.values(survey.questions.byId || {});
  const question = questions.find((obj) => obj?.position === 0);

  // Get access to the dispatch function for Redux actions
  const dispatch = useDispatch<AppDispatch>();

  // Handle uKey if provided via URL
  useEffect(() => {
    if (uKey && survey.metadata && !survey.metadata.uKey) {
      dispatch(setUKey(uKey));
    }
  }, [uKey, dispatch, survey.metadata]);

  // Safely handle potential undefined question or options
  const options = question?.options
    ? question.options.reduce((acc, optionId) => {
        const byId = survey.qsOptions?.byId as { [key: string]: IQsOption };
        if (byId?.[optionId]) {
          acc[optionId] = byId[optionId];
        }
        return acc;
      }, {} as { [key: string]: IQsOption })
    : {};

  const totalCredits = question?.totalCredits || 100; // Default to 100 if undefined
  const [currCost, setCurrCost] = useState(0);

  useEffect(() => {
    if (Object.keys(options).length > 0) {
      setCurrCost(
        Object.values(options).reduce(
          (acc, option) => acc + Math.pow(option?.votes || 0, 2),
          0
        )
      );
    } else {
      setCurrCost(0);
    }
  }, [options]);

  // Determine current view
  const [currentView, setCurrentView] = useState<
    "welcome" | "organize" | "vote"
  >("welcome");

  // Initialize categories
  const userDefinedCategories = ["Positive", "Neutral", "Negative"];
  const [showConfirmation, setShowConfirmation] = useState(false);
  const categoryiesHasSkip = true;

  // Only run this effect when the currentView changes or when component mounts
  useEffect(() => {
    // Only dispatch if we have valid options
    if (Object.keys(options).length > 0) {
      dispatch(
        setPositionGroups({
          userDefinedCategories: userDefinedCategories,
          categoryiesHasSkip: categoryiesHasSkip,
          page:
            currentView === "welcome"
              ? "organize"
              : (currentView as "organize" | "vote"),
        })
      );
      dispatch(calPosition());
    }
    // We intentionally only want this to run when currentView changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, dispatch]);

  /**
   * Navigate to the next view in the workflow.
   * - From welcome: go to organize or vote based on style
   * - From organize: move any remaining undecided items to Skip and go to vote
   */
  const navigateToNextPage = () => {
    if (currentView === "welcome") {
      // From welcome screen, go to either organize or directly to vote
      if (style === "text") {
        setCurrentView("vote");
      } else {
        setCurrentView("organize");
      }
    } else if (currentView === "organize") {
      // From organize view, prepare for voting

      // Move any remaining undecided items to the Skip category
      if (Object.keys(options).length > 0) {
        dispatch(
          mergeOptionGroups({
            target: "Skip",
            source: "Undecided",
          })
        );
      }

      // Transition to the voting view
      setCurrentView("vote");
      // Reset confirmation state
      setShowConfirmation(false);
    }
  };
  
  /**
   * Handle next button click in organize view with special logic for undecided options
   */
  const handleOrganizeNextClick = () => {
    // Check for undecided options
    const undecidedOptions = Object.values(options)
      .filter((option) => option.group === "Undecided")
      .map((option) => option.position);
    
    console.log("Undecided options:", undecidedOptions);
    console.log("Current showConfirmation state:", showConfirmation);
    
    if (undecidedOptions.length > 0 && !showConfirmation) {
      // First click with undecided options - show warning
      console.log("Setting showConfirmation to true");
      setShowConfirmation(true);
    } else {
      // Either no undecided options or second click - proceed
      console.log("Navigating to next page");
      navigateToNextPage();
    }
  };

  /**
   * Navigate to the previous view in the workflow.
   * - From organize: go back to welcome
   * - From vote: go back to previous screen
   *   - If in text mode: go back to welcome
   *   - If in interactive mode: go back to organize and move skipped items back to Undecided
   */
  const navigateToPreviousPage = () => {
    if (currentView === "organize") {
      // Return from organize view to welcome
      setCurrentView("welcome");
    } else if (currentView === "vote") {
      if (style === "text") {
        // In text mode, go directly back to welcome
        setCurrentView("welcome");
      } else {
        // In interactive mode, go back to organize and move skipped items

        // Move items from Skip back to Undecided
        if (Object.keys(options).length > 0) {
          dispatch(
            mergeOptionGroups({
              target: "Undecided",
              source: "Skip",
            })
          );
        }

        // Transition back to the organize view
        setCurrentView("organize");
      }
    }
  };

  // Check if we have a valid question with options before rendering content
  if (!question || !question.options || Object.keys(options).length === 0) {
    return (
      <div className="Container container-width-limited">
        <div className="header">
          <div className="title">Survey Error</div>
        </div>
        <div
          className="container-narrow"
          style={{ padding: "20px", textAlign: "center" }}
        >
          <p>
            Sorry, this survey could not be loaded or contains no questions.
          </p>
          <p>Please check the survey ID and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="content-with-nav-space">
        {/* Render the current view component based on state */}
        {currentView === "welcome" && (
          <WelcomeView style={style} onBeginClick={navigateToNextPage} />
        )}

        {currentView === "organize" && (
          <OrganizeView
            question={question}
            options={options}
            optionPositions={
              survey.qsOptions.positions as { [key: string]: string[] }
            }
            categories={
              survey.qsOptions.categorySequence?.currentViewCategories || []
            }
            showConfirmation={showConfirmation}
          />
        )}

        {currentView === "vote" && (
          <VotingView
            question={question}
            options={options}
            optionPositions={
              survey.qsOptions.positions as { [key: string]: string[] }
            }
            categories={
              survey.qsOptions.categorySequence?.currentViewCategories || []
            }
            totalCredits={totalCredits}
            currCost={currCost}
            style={style}
            inputType={inputType}
          />
        )}
      </div>

      {/* Spacer div to prevent content from being hidden behind the navbar */}
      <div style={{ height: "100px" }}></div>

      {/* The always-present NavPanel */}
      <QsNavBar
        totalCredits={totalCredits}
        currCost={currCost}
        optionList={options}
        currentView={currentView}
        isTextMode={style === "text"}
        showConfirmation={showConfirmation && currentView === "organize"}
        onNextClick={
          currentView === "organize" 
            ? handleOrganizeNextClick 
            : currentView === "welcome" 
              ? navigateToNextPage 
              : undefined
        }
        onPreviousClick={
          // Enable back button for both text and interactive modes
          currentView === "vote" ||
          (currentView === "organize" && style !== "text")
            ? navigateToPreviousPage
            : undefined
        }
      />
    </>
  );
};

export default QuadraticSurveyPage;
