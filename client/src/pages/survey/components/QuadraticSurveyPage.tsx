import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  selectActiveQvQuestionId,
  selectQuestionResponseIds,
  selectQvNavigator,
  selectQvQuestion,
  selectQvViewCategories,
} from "../../../features/unifiedResponsesSelectors";
import { QvQuestionState } from "../../../types/responseTypes";
import {
  goToNextQvQuestion,
  goToPreviousQvQuestion,
  markQvQuestionCompleted,
  markQvQuestionIncomplete,
  syncQvNavigator,
} from "../../../features/unifiedResponsesSlice";

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
  const ENABLE_UNIFIED_QV = process.env.REACT_APP_ENABLE_UNIFIED_QV !== 'false';
  const dispatch = useDispatch<AppDispatch>();

  // Initialize data used in this page from the Redux store
  const survey = useAppSelector((state) => state);
  const questionsById = survey.questions.byId || {};
  const questionList = useMemo(() => Object.values(questionsById), [questionsById]);

  const qvOrder = useMemo(() => {
    if (!ENABLE_UNIFIED_QV) return [] as string[];
    return questionList
      .filter((item: any) => (item?.type ?? 'qv') === 'qv')
      .slice()
      .sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0))
      .map((item: any) => item?.questionId || item?._id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
  }, [ENABLE_UNIFIED_QV, questionList]);

  const qvOrderKey = ENABLE_UNIFIED_QV ? qvOrder.join('|') : '';

  const activeQvQuestionId = useAppSelector((state) =>
    ENABLE_UNIFIED_QV ? selectActiveQvQuestionId(state as any) : undefined,
  );
  const questionResponseIds = useAppSelector((state) =>
    ENABLE_UNIFIED_QV ? selectQuestionResponseIds(state as any) : undefined,
  );
  const unifiedResponsesByQuestion = useAppSelector(
    (state) => (ENABLE_UNIFIED_QV ? (state as any).unifiedResponses.byQuestionId : undefined),
  );
  const qvNavigator = useAppSelector((state) =>
    ENABLE_UNIFIED_QV ? selectQvNavigator(state as any) : undefined,
  );
  const resumeSyncAppliedRef = useRef(false);

  const fallbackQuestion = questionList.find((obj: any) => obj?.position === 0);

  const effectiveQuestionId = ENABLE_UNIFIED_QV
    ? activeQvQuestionId || qvOrder[0]
    : fallbackQuestion?.questionId || (fallbackQuestion as any)?._id;

  const question = effectiveQuestionId
    ? (questionsById as any)[effectiveQuestionId] ||
      questionList.find(
        (item: any) => (item?.questionId || item?._id) === effectiveQuestionId,
      )
    : fallbackQuestion;

  const questionId = question?.questionId || (question as any)?._id;

  const qvUnified = useAppSelector((state) =>
    ENABLE_UNIFIED_QV && questionId
      ? (selectQvQuestion(state as any, questionId) as any)
      : undefined,
  );

  const isLastNavigatorQuestion =
    ENABLE_UNIFIED_QV && questionId && qvOrder.length > 0
      ? questionId === qvOrder[qvOrder.length - 1]
      : false;

  const isFirstNavigatorQuestion =
    ENABLE_UNIFIED_QV && questionId && qvOrder.length > 0
      ? questionId === qvOrder[0]
      : true;

  const canNavigateToPreviousQuestion = ENABLE_UNIFIED_QV && !isFirstNavigatorQuestion;

  const completedNavigatorList = useMemo(() => {
    if (!ENABLE_UNIFIED_QV || !qvNavigator) return [] as string[];
    return Object.entries(qvNavigator.completed || {})
      .filter(([, value]) => Boolean(value))
      .map(([questionId]) => questionId)
      .sort();
  }, [ENABLE_UNIFIED_QV, qvNavigator]);

  const navigatorOrderSignature = useMemo(
    () => (qvNavigator?.order || []).join('|'),
    [qvNavigator?.order],
  );
  const navigatorCompletedSignature = useMemo(
    () => completedNavigatorList.join('|'),
    [completedNavigatorList],
  );
  const navigatorActiveId = qvNavigator?.activeQuestionId;

  const completedSignature = completedNavigatorList.join('|');

  const resumeCompletionCandidates = useMemo(() => {
    if (!ENABLE_UNIFIED_QV || !qvOrder.length) return [] as string[];
    const result: string[] = [];
    qvOrder.forEach((id) => {
      const qvState = unifiedResponsesByQuestion?.[id];
      const hasVotes =
        qvState?.type === 'qv' &&
        Object.values(qvState.options || {}).some((option: any) => option?.votes && option.votes !== 0);
      const hasResponseId = Boolean(questionResponseIds?.[id]);
      if (hasResponseId || hasVotes) {
        result.push(id);
      }
    });
    return result.sort();
  }, [ENABLE_UNIFIED_QV, qvOrder, questionResponseIds, unifiedResponsesByQuestion]);

  const resumeCandidatesSignature = resumeCompletionCandidates.join('|');

  useEffect(() => {
    if (!ENABLE_UNIFIED_QV) return;
    if (navigatorOrderSignature === qvOrderKey) return;
    dispatch(syncQvNavigator({ order: qvOrder }));
  }, [dispatch, ENABLE_UNIFIED_QV, qvOrderKey, navigatorOrderSignature]);

  useEffect(() => {
    if (!ENABLE_UNIFIED_QV) return;
    if (!qvOrder.length) return;
    if (navigatorOrderSignature !== qvOrderKey) return;

    const shouldApplyResume =
      !resumeSyncAppliedRef.current &&
      completedNavigatorList.length === 0 &&
      resumeCompletionCandidates.length > 0;

    const completionsToApply = shouldApplyResume ? resumeCompletionCandidates : completedNavigatorList;
    const completedSet = new Set(completionsToApply);
    const desiredActive =
      activeQvQuestionId && qvOrder.includes(activeQvQuestionId)
        ? activeQvQuestionId
        : qvOrder.find((id) => !completedSet.has(id)) ?? qvOrder[0];

    const desiredCompletedSignature = completionsToApply.join('|');

    const needsCompletionSync = navigatorCompletedSignature !== desiredCompletedSignature;
    const needsActiveSync = navigatorActiveId !== desiredActive;

    if (needsCompletionSync || needsActiveSync) {
      dispatch(
        syncQvNavigator({
          order: qvOrder,
          completed: needsCompletionSync ? completionsToApply : completedNavigatorList,
          activeQuestionId: desiredActive,
        }),
      );
    }

    if (shouldApplyResume) {
      resumeSyncAppliedRef.current = true;
    }
  }, [
    dispatch,
    ENABLE_UNIFIED_QV,
    qvOrderKey,
    completedSignature,
    resumeCandidatesSignature,
    activeQvQuestionId,
    navigatorCompletedSignature,
    navigatorActiveId,
    navigatorOrderSignature,
  ]);

  const votePrimaryMode = ENABLE_UNIFIED_QV && !isLastNavigatorQuestion ? 'next' : 'submit';
  const votePrimaryLabel = votePrimaryMode === 'next' ? 'Next Question →' : undefined;
  const voteBackLabel = canNavigateToPreviousQuestion ? '← Previous Question' : undefined;

  // Handle uKey if provided via URL
  useEffect(() => {
    if (uKey && survey.metadata && !survey.metadata.uKey) {
      dispatch(setUKey(uKey));
    }
  }, [uKey, dispatch, survey.metadata]);

  // Safely handle potential undefined question or options
  const legacyOptions = question?.options
    ? question.options.reduce((acc: { [key: string]: IQsOption }, optionId: string) => {
        const byId = survey.qsOptions?.byId as { [key: string]: IQsOption };
        if (byId?.[optionId]) {
          acc[optionId] = byId[optionId];
        }
        return acc;
      }, {} as { [key: string]: IQsOption })
    : {};

  const options: { [key: string]: IQsOption } = useMemo(() => {
    if (!ENABLE_UNIFIED_QV || !qvUnified || (qvUnified as any).type !== 'qv' || !questionId) {
      return legacyOptions;
    }

    const qvState = qvUnified as QvQuestionState;
    const map: { [key: string]: IQsOption } = {};
    Object.values(qvState.options).forEach((option) => {
      const legacy = legacyOptions[option.optionId];
      map[option.optionId] = {
        optionId: option.optionId,
        optionName: option.optionName || legacy?.optionName || option.optionId,
        description: legacy?.description || '',
        questionId,
        group: option.group,
        votes: option.votes,
        position: option.globalPosition,
        groupPosition: option.groupPosition,
      } as IQsOption;
    });
    return map;
  }, [ENABLE_UNIFIED_QV, qvUnified, questionId, legacyOptions]);

  const totalCredits = question?.totalCredits || 100; // Default to 100 if undefined
  const currCost = useMemo(
    () =>
      Object.values(options).reduce(
        (acc, option) => acc + Math.pow(option?.votes || 0, 2),
        0,
      ),
    [options],
  );

  // Determine current view
  const [currentView, setCurrentView] = useState<
    "welcome" | "organize" | "vote"
  >("welcome");

  // Initialize categories
  const userDefinedCategories = useMemo(() => ["Positive", "Neutral", "Negative"], []);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const categoryiesHasSkip = true;

  useEffect(() => {
    if (!ENABLE_UNIFIED_QV) return;
    if (!questionId) return;
    setCurrentView(style === "text" ? "vote" : "welcome");
    setShowConfirmation(false);
  }, [ENABLE_UNIFIED_QV, questionId, style]);

  const unifiedCategories = useAppSelector((state) =>
    ENABLE_UNIFIED_QV && questionId
      ? (selectQvViewCategories(
          state as any,
          questionId,
          currentView === "vote" ? "vote" : "organize",
        ) as string[])
      : [],
  );

  const hasOptions = useMemo(() => Object.keys(options).length > 0, [options]);

  // Only run this effect when the currentView changes or when component mounts
  useEffect(() => {
    if (!hasOptions) return;
    dispatch(
      setPositionGroups({
        userDefinedCategories,
        categoryiesHasSkip: categoryiesHasSkip,
        page:
          currentView === "welcome"
            ? "organize"
            : (currentView as "organize" | "vote"),
      })
    );
    dispatch(calPosition());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, dispatch, hasOptions, questionId]);

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

  const handleVoteNextClick = () => {
    if (ENABLE_UNIFIED_QV && questionId) {
      dispatch(markQvQuestionCompleted(questionId));
      if (!isLastNavigatorQuestion) {
        dispatch(goToNextQvQuestion());
        setShowConfirmation(false);
        return;
      }
    }
    setShowConfirmation(false);
  };

  const handleVotePreviousQuestion = () => {
    if (ENABLE_UNIFIED_QV && questionId) {
      dispatch(markQvQuestionIncomplete(questionId));
      dispatch(goToPreviousQvQuestion());
      setShowConfirmation(false);
      return;
    }
    navigateToPreviousPage();
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
          <WelcomeView mode={style} onBeginClick={navigateToNextPage} />
        )}

        {currentView === "organize" && (
          <OrganizeView
            question={question}
            options={options}
            optionPositions={
              (ENABLE_UNIFIED_QV && qvUnified && (qvUnified as any).type === 'qv'
                ? (Object.fromEntries(
                    Object.entries((qvUnified as QvQuestionState).positionsByGroup).map(([group, ids]) => [
                      group,
                      [...ids],
                    ]),
                  ) as { [key: string]: string[] })
                : (survey.qsOptions.positions as { [key: string]: string[] }))
            }
            categories={
              ENABLE_UNIFIED_QV && qvUnified && (qvUnified as any).type === 'qv'
                ? unifiedCategories
                : survey.qsOptions.categorySequence?.currentViewCategories || []
            }
            showConfirmation={showConfirmation}
          />
        )}

        {currentView === "vote" && (
          <VotingView
            question={question}
            options={options}
            optionPositions={
              (ENABLE_UNIFIED_QV && qvUnified && (qvUnified as any).type === 'qv'
                ? (Object.fromEntries(
                    Object.entries((qvUnified as QvQuestionState).positionsByGroup).map(([group, ids]) => [
                      group,
                      [...ids],
                    ]),
                  ) as { [key: string]: string[] })
                : (survey.qsOptions.positions as { [key: string]: string[] }))
            }
            categories={
              ENABLE_UNIFIED_QV && qvUnified && (qvUnified as any).type === 'qv'
                ? unifiedCategories
                : survey.qsOptions.categorySequence?.currentViewCategories || []
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
        voteCtaMode={votePrimaryMode}
        voteCtaLabel={votePrimaryLabel}
        voteBackLabel={voteBackLabel}
        onNextClick={
          currentView === "organize" 
            ? handleOrganizeNextClick 
            : currentView === "welcome" 
              ? navigateToNextPage 
              : currentView === "vote"
                ? handleVoteNextClick
                : undefined
        }
        onPreviousClick={
          // Enable back button for both text and interactive modes
          currentView === "vote"
            ? (canNavigateToPreviousQuestion ? handleVotePreviousQuestion : navigateToPreviousPage)
            : (currentView === "organize" && style !== "text")
              ? navigateToPreviousPage
              : undefined
        }
      />
    </>
  );
};

export default QuadraticSurveyPage;
