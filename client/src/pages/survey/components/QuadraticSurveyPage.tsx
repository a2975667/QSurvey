import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";
import { useSearchParams } from "react-router-dom";
import { IQsOption } from "../../../types/coreTypes";
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
  selectUnifiedSlice,
} from "../../../features/unifiedResponsesSelectors";
import { QvQuestionState } from "../../../types/responseTypes";
import {
  goToPreviousQvQuestion,
  markQvQuestionIncomplete,
  syncQvNavigator,
  qvMergeGroups,
  qvCalibratePositions,
} from "../../../features/unifiedResponsesSlice";
import { submitQvQuestion, SubmitQvQuestionResult } from "../../../components/QsNavBar/submission";

// Props interface for the QuadraticSurveyPage
interface QuadraticSurveyPageProps {
  style: "text" | "interactive";
  inputType?: "wheel" | "dropdown";
  onCompleteLastQuestion?: (result?: SubmitQvQuestionResult) => void | Promise<void>;
  hasNextModuleAfterQv?: boolean;
  /**
   * Controls whether the module renders the instruction/welcome screen.
   * Backward compatible default: when omitted/undefined, instructions are shown.
   */
  showInstructions?: boolean;
  /**
   * Optional explicit list of QV question IDs to render, in the desired order.
   * When omitted, the component will use the questions slice ordering fallback.
   */
  questionIds?: string[];
}

// Main quadratic voting survey component
const QuadraticSurveyPage: React.FC<QuadraticSurveyPageProps> = ({
  style,
  inputType = "dropdown",
  onCompleteLastQuestion,
  hasNextModuleAfterQv = false,
  showInstructions = true,
  questionIds,
}) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get("uKey");
  const dispatch = useDispatch<AppDispatch>();

  // Initialize data used in this page from the Redux store
  const questionsState = useAppSelector((state) => state.questions);
  const metadata = useAppSelector((state) => state.metadata);
  const unifiedState = useAppSelector(selectUnifiedSlice);
  const questionsById = useMemo(() => questionsState.byId ?? {}, [questionsState.byId]);
  const questionList = useMemo(() => {
    const orderedIds: string[] = Array.isArray(questionIds) && questionIds.length > 0
      ? questionIds
      : Array.isArray((questionsState as any).order) && (questionsState as any).order.length > 0
        ? (questionsState as any).order
        : Object.keys(questionsById);
    return orderedIds
      .map((id: string) => (questionsById as any)[id])
      .filter(Boolean);
  }, [questionsById, questionIds, questionsState]);

  const qvOrder: string[] = useMemo(() => {
    const orderedIds = questionList
      .filter((item: any) => (item?.type ?? 'qv') === 'qv')
      .map((item: any) => item?.questionId || item?._id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
    if (orderedIds.length > 0) return orderedIds;

    // Fallback to legacy position-based ordering if needed
    return questionList
      .filter((item: any) => (item?.type ?? 'qv') === 'qv')
      .slice()
      .sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0))
      .map((item: any) => item?.questionId || item?._id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
  }, [questionList]);

  const qvOrderKey = qvOrder.join('|');

  const activeQvQuestionId = useAppSelector((state: RootState) => selectActiveQvQuestionId(state));
  const questionResponseIds = useAppSelector((state: RootState) => selectQuestionResponseIds(state));
  const unifiedResponsesByQuestion = useAppSelector((state: RootState) => state.unifiedResponses.byQuestionId);
  const qvNavigator = useAppSelector((state: RootState) => selectQvNavigator(state));
  const resumeSyncAppliedRef = useRef(false);

  const fallbackQuestion = questionList[0];

  const effectiveQuestionId =
    (activeQvQuestionId && qvOrder.includes(activeQvQuestionId) ? activeQvQuestionId : undefined) ||
    qvOrder[0];

  const question = effectiveQuestionId
    ? (questionsById as any)[effectiveQuestionId] ||
      questionList.find(
        (item: any) => (item?.questionId || item?._id) === effectiveQuestionId,
      )
    : fallbackQuestion;

  const questionId = question?.questionId || (question as any)?._id;

  const qvUnified = useAppSelector((state: RootState) =>
    questionId ? (selectQvQuestion(state, questionId) as any) : undefined,
  );

  const isLastNavigatorQuestion = Boolean(
    questionId && qvOrder.length > 0 && questionId === qvOrder[qvOrder.length - 1],
  );

  const isFirstNavigatorQuestion = Boolean(questionId && qvOrder.length > 0 && questionId === qvOrder[0]);

  const canNavigateToPreviousQuestion = Boolean(questionId && !isFirstNavigatorQuestion);
  const moduleShowInstructions = showInstructions !== false;

  useEffect(() => {
    console.log('[DEBUG][QuadraticSurveyPage] showInstructions state', {
      questionId,
      qvOrderCount: qvOrder.length,
      showInstructions,
      moduleShowInstructions,
    });
  }, [questionId, qvOrder.length, showInstructions, moduleShowInstructions]);

  const completedNavigatorList = useMemo(() => {
    if (!qvNavigator) return [] as string[];
    return Object.entries(qvNavigator.completed || {})
      .filter(([, value]) => Boolean(value))
      .map(([questionId]) => questionId)
      .sort();
  }, [qvNavigator]);

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
    if (!qvOrder.length) return [] as string[];
    const result: string[] = [];
    qvOrder.forEach((id: string) => {
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
  }, [qvOrder, questionResponseIds, unifiedResponsesByQuestion]);

  const resumeCandidatesSignature = resumeCompletionCandidates.join('|');

  useEffect(() => {
    if (navigatorOrderSignature === qvOrderKey) return;
    dispatch(syncQvNavigator({ order: qvOrder }));
  }, [dispatch, qvOrderKey, navigatorOrderSignature, qvOrder]);

  useEffect(() => {
    if (!qvOrder.length) return;
    if (navigatorOrderSignature !== qvOrderKey) return;

    const shouldApplyResume =
      !resumeSyncAppliedRef.current &&
      completedNavigatorList.length === 0 &&
      resumeCompletionCandidates.length > 0;

    const completionsToApply = shouldApplyResume ? resumeCompletionCandidates : completedNavigatorList;
    const completedSet = new Set(completionsToApply);
    const allDone = qvOrder.length > 0 && qvOrder.every((id: string) => completedSet.has(id));
    const desiredActive = allDone
      ? undefined
      : activeQvQuestionId && qvOrder.includes(activeQvQuestionId)
        ? activeQvQuestionId
        : qvOrder.find((id: string) => !completedSet.has(id)) ?? qvOrder[0];

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
    qvOrderKey,
    completedSignature,
    resumeCandidatesSignature,
    activeQvQuestionId,
    navigatorCompletedSignature,
    navigatorActiveId,
    navigatorOrderSignature,
    completedNavigatorList,
    resumeCompletionCandidates,
    qvOrder,
  ]);

  const hasNextModule = hasNextModuleAfterQv && isLastNavigatorQuestion;
  const votePrimaryMode = !isLastNavigatorQuestion || hasNextModule ? 'next' : 'submit';
  const votePrimaryLabel = !isLastNavigatorQuestion
    ? 'Next Question →'
    : hasNextModule
      ? 'Next Module →'
      : undefined;
  const voteBackLabel = canNavigateToPreviousQuestion ? '← Previous Question' : undefined;

  // Handle uKey if provided via URL
  useEffect(() => {
    if (uKey && metadata && !metadata.uKey) {
      dispatch(setUKey(uKey));
    }
  }, [uKey, dispatch, metadata]);

  const optionMetadata = useMemo(() => {
    const raw = (question as any)?.rawOptions;
    if (!Array.isArray(raw)) return {} as Record<string, { optionName?: string; description?: string }>;
    return raw.reduce((acc: Record<string, { optionName?: string; description?: string }>, opt: any) => {
      if (opt?.optionId) {
        acc[opt.optionId] = {
          optionName: opt.optionName,
          description: opt.description || '',
        };
      }
      return acc;
    }, {});
  }, [question]);

  const options: { [key: string]: IQsOption } = useMemo(() => {
    if (!qvUnified || (qvUnified as any).type !== 'qv' || !questionId) {
      return {};
    }

    const qvState = qvUnified as QvQuestionState;
    const map: { [key: string]: IQsOption } = {};
    Object.values(qvState.options).forEach((option) => {
      const meta = optionMetadata[option.optionId] || {};
      map[option.optionId] = {
        optionId: option.optionId,
        optionName: option.optionName || meta.optionName || option.optionId,
        description: meta.description || '',
        questionId,
        group: option.group,
        votes: option.votes,
        position: option.globalPosition ?? 0,
        groupPosition: option.groupPosition ?? 0,
      } as IQsOption;
    });
    return map;
  }, [qvUnified, questionId, optionMetadata]);

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
  const initialView: "welcome" | "organize" | "vote" =
    style === "text" ? "vote" : moduleShowInstructions ? "welcome" : "organize";

  const [currentView, setCurrentView] = useState<"welcome" | "organize" | "vote">(initialView);

  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    setCurrentView(style === "text" ? "vote" : moduleShowInstructions ? "welcome" : "organize");
    setShowConfirmation(false);
  }, [questionId, style, moduleShowInstructions]);

  const unifiedCategories = useAppSelector((state) =>
    questionId
      ? (selectQvViewCategories(
          state as any,
          questionId,
          currentView === "vote" ? "vote" : "organize",
        ) as string[])
      : [],
  );

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
      if (questionId && Object.keys(options).length > 0) {
        dispatch(
          qvMergeGroups({
            questionId,
            target: "Skip",
            source: "Undecided",
          })
        );
        dispatch(qvCalibratePositions({ questionId }));
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

    if (undecidedOptions.length > 0 && !showConfirmation) {
      setShowConfirmation(true);
    } else {
      navigateToNextPage();
    }
  };

  const handleVotePreviousQuestion = () => {
    if (questionId) {
      dispatch(markQvQuestionIncomplete(questionId));
      dispatch(goToPreviousQvQuestion());
      setShowConfirmation(false);
      return;
    }
    navigateToPreviousPage();
  };

  const handleVotePrimaryAction = async () => {
    if (!questionId || !qvUnified || (qvUnified as any).type !== 'qv') {
      return;
    }

    const remainingCredits = totalCredits - currCost;
    if (remainingCredits < 0) {
      throw new Error("You don't have enough credits. Please reduce some votes.");
    }

    const submissionResult = await submitQvQuestion({
      dispatch,
      questionId,
      qvState: qvUnified as QvQuestionState,
      unifiedState,
      metadata: {
        surveyId: metadata.surveyId,
        sKey: metadata.sKey,
        uKey: metadata.uKey,
      },
    });

    setShowConfirmation(false);

    if (!isLastNavigatorQuestion) {
      // Navigator state (completion/next active) is synchronized within submitQvQuestion
      return;
    }

    if (hasNextModuleAfterQv) {
      await onCompleteLastQuestion?.(submissionResult);
    } else {
      await onCompleteLastQuestion?.(submissionResult);
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
      if (moduleShowInstructions) {
        setCurrentView("welcome");
      }
    } else if (currentView === "vote") {
      if (style === "text") {
        // In text mode, go directly back to welcome
        setCurrentView("welcome");
      } else {
        // In interactive mode, go back to organize and move skipped items

        // Move items from Skip back to Undecided
        if (questionId && Object.keys(options).length > 0) {
          dispatch(
            qvMergeGroups({
              questionId,
              target: "Undecided",
              source: "Skip",
            })
          );
          dispatch(qvCalibratePositions({ questionId }));
        }

        // Transition back to the organize view
        setCurrentView("organize");
      }
    }
  };

  const organizeBackLabel = moduleShowInstructions ? '← Instructions' : voteBackLabel;
  const organizePreviousClick = moduleShowInstructions
    ? navigateToPreviousPage
    : canNavigateToPreviousQuestion
      ? handleVotePreviousQuestion
      : undefined;

  const optionPositionsByGroup = useMemo(() => {
    if (!qvUnified || (qvUnified as any).type !== 'qv') return {} as { [key: string]: string[] };
    const qvState = qvUnified as QvQuestionState;
    return Object.fromEntries(
      Object.entries(qvState.positionsByGroup).map(([group, ids]) => [group, [...ids]]),
    ) as { [key: string]: string[] };
  }, [qvUnified]);

  if (!question || !qvUnified || (qvUnified as any).type !== 'qv' || Object.keys(options).length === 0) {
    return (
      <div className="Container container-width-limited">
        <div className="header">
          <div className="title">Survey Error</div>
        </div>
        <div className="container-narrow" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Sorry, this survey could not be loaded or contains no questions.</p>
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
            questionId={questionId as string}
            question={question}
            options={options}
            optionPositions={optionPositionsByGroup}
            categories={unifiedCategories}
            showConfirmation={showConfirmation}
          />
        )}

        {currentView === "vote" && (
          <VotingView
            questionId={questionId as string}
            question={question}
            options={options}
            optionPositions={optionPositionsByGroup}
            categories={unifiedCategories}
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
        submissionStatus={unifiedState.status}
        voteCtaMode={votePrimaryMode}
        voteCtaLabel={votePrimaryLabel}
        voteBackLabel={voteBackLabel}
        organizeBackLabel={organizeBackLabel}
        onNextClick={
          currentView === "organize" 
            ? handleOrganizeNextClick 
            : currentView === "welcome" 
              ? navigateToNextPage 
              : undefined
        }
        onPreviousClick={
          // Enable back button for both text and interactive modes
          currentView === "vote"
            ? (canNavigateToPreviousQuestion ? handleVotePreviousQuestion : navigateToPreviousPage)
            : (currentView === "organize" && style !== "text")
              ? organizePreviousClick
              : undefined
        }
        onPrimaryAction={currentView === "vote" ? handleVotePrimaryAction : undefined}
      />
    </>
  );
};

export default QuadraticSurveyPage;
