import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";
import { useSearchParams } from "react-router-dom";
import { IQsOption } from "../../../types/coreTypes";
import { IBackendQuestion } from "../../../types/backendTypes";
import { setUKey } from "../../../features/metadataSlice";
import WelcomeView from "./WelcomeView";
import OrganizeView from "./OrganizeView";
import VotingView from "./VotingView";
import SelectionView from "./SelectionView";
import QsNavBar from "../../../components/QsNavBar";
import {
  selectActiveQvQuestionId,
  selectQuestionResponseIds,
  selectQvNavigator,
  selectQvQuestion,
  selectQvViewCategories,
  selectUnifiedSlice,
} from "../../../features/unifiedResponsesSelectors";
import { QvQuestionState, QvPlusQuestionState } from "../../../types/responseTypes";
import { IBackendQVPlusSetting } from "../../../types/backendTypes";
import {
  goToPreviousQvQuestion,
  goToNextQvQuestion,
  markQvQuestionIncomplete,
  markQvQuestionCompleted,
  syncQvNavigator,
  qvMergeGroups,
  qvCalibratePositions,
  qvPlusSetFollowupAnswer,
  qvPlusStartNextRound,
} from "../../../features/unifiedResponsesSlice";
import { submitQvQuestion, SubmitQvQuestionResult } from "../../../components/QsNavBar/submission";
import { debugLog } from "../../../utils/debugLog";
import { resolveQvLabels, ResolvedQvLabels } from "../../../i18n/qvLabels";

// QVPlus pilot toggle: when true, each round (after the first) restarts at the
// organize stage so respondents can re-classify options between rounds. When
// false (default), only the first round has an organize stage and subsequent
// rounds jump straight to vote with carry-over groupings.
const ORGANIZE_PER_ROUND = true;

// QVPlus pilot toggle: when true, the vote stage restricts the vote dropdown by
// each option's category — options classified "Positive" only offer no-vote +
// upvotes, "Negative" only offer no-vote + downvotes, and "Neutral" (and any
// other group) keep the full upvote / no-vote / downvote range. When false,
// every option keeps the full range. Only applies to QVPlus questions.
const RESTRICT_VOTE_BY_CATEGORY = true;

// QVPlus pilot toggle: when true, the vote stage greys out (but still allows)
// any vote whose cost would push the running total over the budget, so
// respondents see which votes are "over budget" before committing. The existing
// hard block on proceeding with a negative balance still applies. Only affects
// QVPlus questions.
const MARK_OVER_BUDGET_VOTES = true;

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
  surveyLocale?: string;
  /**
   * Optional explicit list of QV question IDs to render, in the desired order.
   * When omitted, the component will use the questions slice ordering fallback.
   */
  questionIds?: string[];
  qvLabels?: ResolvedQvLabels;
}

// Main quadratic voting survey component
const QuadraticSurveyPage: React.FC<QuadraticSurveyPageProps> = ({
  style,
  inputType = "dropdown",
  onCompleteLastQuestion,
  hasNextModuleAfterQv = false,
  showInstructions = true,
  questionIds,
  surveyLocale,
  qvLabels,
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
      .filter((item: any) => ['qv', 'qvplus'].includes(item?.type ?? 'qv'))
      .map((item: any) => item?.questionId || item?._id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
    if (orderedIds.length > 0) return orderedIds;

    // Fallback to legacy position-based ordering if needed
    return questionList
      .filter((item: any) => ['qv', 'qvplus'].includes(item?.type ?? 'qv'))
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
  const resolvedQvLabels = useMemo(
    () =>
      qvLabels ||
      resolveQvLabels(surveyLocale, (question as any)?.setting?.labelOverrides),
    [qvLabels, surveyLocale, question],
  );

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
    debugLog('[DEBUG][QuadraticSurveyPage] showInstructions state', {
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
        (qvState?.type === 'qv' || qvState?.type === 'qvplus') &&
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
  // A QVPlus vote never submits — it advances to that round's selection page —
  // so its button reads "Next →" regardless of navigator position. Regular QV is
  // untouched and keeps its existing Next Question / Next Module / Submit labels.
  const votePrimaryLabel = (qvUnified?.type === 'qvplus')
    ? resolvedQvLabels.text.qvPlusNextStep
    : !isLastNavigatorQuestion
      ? 'Next Question →'
      : hasNextModule
        ? 'Next Module →'
        : undefined;
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
    if (
      !qvUnified
      || ((qvUnified as any).type !== 'qv' && (qvUnified as any).type !== 'qvplus')
      || !questionId
    ) {
      return {};
    }

    // Both QV and QVPlus share the same options/positionsByGroup shape; the cast
    // to QvQuestionState is structurally safe for the fields we read here.
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

  // ── QVPlus helpers ────────────────────────────────────────────────────────
  // qvUnified is the active question's response state in Redux.
  // For QVPlus questions we need: which round is active, what's the round
  // definition (for filter + followups), and a "is the current question qvplus?" flag.
  const isQvPlusQuestion = qvUnified?.type === 'qvplus';
  const qvPlusUnified = isQvPlusQuestion ? (qvUnified as QvPlusQuestionState) : undefined;
  const qvPlusSetting = isQvPlusQuestion
    ? (question?.setting as IBackendQVPlusSetting | undefined)
    : undefined;
  const activeRoundId = qvPlusUnified?.activeRoundId;
  const activeRound = qvPlusSetting && activeRoundId
    ? qvPlusSetting.rounds.find((r) => r.roundId === activeRoundId)
    : undefined;
  const activeRoundIndex = qvPlusSetting && activeRoundId
    ? qvPlusSetting.rounds.findIndex((r) => r.roundId === activeRoundId)
    : -1;
  const isLastRound = qvPlusSetting && activeRoundIndex >= 0
    ? activeRoundIndex === qvPlusSetting.rounds.length - 1
    : false;

  // Round 2+ of a QVPlus question that still has a per-round organize stage: the
  // vote stage's Previous goes back to THIS round's own organize stage. This is
  // intra-round (activeRoundId never moves) so it's safe — unlike crossing back
  // into an earlier round, which would need a real snapshot-restore.
  const canReturnToRoundOrganize =
    isQvPlusQuestion && activeRoundIndex > 0 && ORGANIZE_PER_ROUND;

  // Round 1 / regular QV keeps the cross-question "Previous Question" label; the
  // round 2+ intra-round case leaves it undefined so QsNavBar falls back to its
  // "← Organization" label.
  const voteBackLabel = canReturnToRoundOrganize
    ? undefined
    : canNavigateToPreviousQuestion
      ? '← Previous Question'
      : undefined;

  // Selection page CTA: it performs the real submit only on the last round of the
  // final QV question with nothing after it; in every other case it just advances,
  // so it stays "Next →".
  const selectionPrimaryLabel =
    isLastRound && isLastNavigatorQuestion && !hasNextModule
      ? resolvedQvLabels.text.submit
      : resolvedQvLabels.text.qvPlusNextStep;


  // Determine current view
  const initialView: "welcome" | "organize" | "vote" | "selection" =
    style === "text" ? "vote" : moduleShowInstructions ? "welcome" : "organize";

  const [currentView, setCurrentView] = useState<"welcome" | "organize" | "vote" | "selection">(initialView);

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
    if (
      !questionId
      || !qvUnified
      || ((qvUnified as any).type !== 'qv' && (qvUnified as any).type !== 'qvplus')
    ) {
      return;
    }

    const remainingCredits = totalCredits - currCost;
    if (remainingCredits < 0) {
      throw new Error(resolvedQvLabels.text.insufficientCreditsError);
    }

    // QVPlus branch: after vote, transition to selection page (no API submit yet).
    if (isQvPlusQuestion) {
      setCurrentView('selection');
      return;
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

  // QVPlus: dispatch when user picks a dropdown option in the selection page.
  const handleQvPlusSetAnswer = (
    optionId: string,
    roundId: string,
    followupId: string,
    choiceId: string,
  ) => {
    if (!questionId) return;
    dispatch(qvPlusSetFollowupAnswer({ questionId, roundId, optionId, followupId, choiceId }));
  };

  // QVPlus: handle the primary action on the selection page.
  // Behavior:
  //   - Not the last round → snapshot current votes + advance to next round's vote stage.
  //   - Last round → submit the full QVPlus answer (votes + rounds + followupAnswers)
  //     to the backend, then mark the question completed so the parent can route.
  const handleSelectionPrimaryAction = async () => {
    if (!questionId || !qvPlusUnified || !qvPlusSetting || !activeRoundId) return;

    if (isLastRound) {
      // Submit BEFORE markQvQuestionCompleted so the backend sees the answer first;
      // the returned surveyResponseId / uuid are then handed to onCompleteLastQuestion
      // so SurveyView can finalise the survey completion.
      const submissionResult = await submitQvQuestion({
        dispatch,
        questionId,
        qvState: qvPlusUnified,
        unifiedState,
        metadata: {
          surveyId: metadata.surveyId,
          sKey: metadata.sKey,
          uKey: metadata.uKey,
        },
      });

      dispatch(markQvQuestionCompleted(questionId));
      if (isLastNavigatorQuestion) {
        await onCompleteLastQuestion?.(submissionResult);
      } else {
        dispatch(goToNextQvQuestion());
      }
      return;
    }

    const nextRoundId = qvPlusSetting.rounds[activeRoundIndex + 1].roundId;
    dispatch(
      qvPlusStartNextRound({
        questionId,
        fromRoundId: activeRoundId,
        toRoundId: nextRoundId,
      }),
    );
    setCurrentView(ORGANIZE_PER_ROUND ? "organize" : "vote");
  };

  // QVPlus: handle going back from selection to the same round's vote stage,
  // so the respondent can tweak their votes for this round.
  const handleSelectionBack = () => {
    setCurrentView("vote");
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

  const organizeBackLabel = moduleShowInstructions ? resolvedQvLabels.text.organizeBackToInstructions : voteBackLabel;
  const organizePreviousClick = moduleShowInstructions
    ? navigateToPreviousPage
    : canNavigateToPreviousQuestion
      ? handleVotePreviousQuestion
      : undefined;

  const optionPositionsByGroup = useMemo(() => {
    if (
      !qvUnified
      || ((qvUnified as any).type !== 'qv' && (qvUnified as any).type !== 'qvplus')
    ) {
      return {} as { [key: string]: string[] };
    }
    const qvState = qvUnified as QvQuestionState;
    return Object.fromEntries(
      Object.entries(qvState.positionsByGroup).map(([group, ids]) => [group, [...ids]]),
    ) as { [key: string]: string[] };
  }, [qvUnified]);

  if (
    !question
    || !qvUnified
    || ((qvUnified as any).type !== 'qv' && (qvUnified as any).type !== 'qvplus')
    || Object.keys(options).length === 0
  ) {
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
          <WelcomeView mode={style} qvLabels={resolvedQvLabels} />
        )}

        {currentView === "organize" && (
          <OrganizeView
            questionId={questionId as string}
            question={
              // For QVPlus rounds, share the vote stage's title/description so the
              // organize and vote stages of the same round read identically.
              isQvPlusQuestion && activeRound
                ? {
                    ...question,
                    question: activeRound.voteTitle ?? question.question,
                    description: activeRound.voteDescription ?? question.description,
                  }
                : question
            }
            options={options}
            optionPositions={optionPositionsByGroup}
            categories={unifiedCategories}
            showConfirmation={showConfirmation}
            qvLabels={resolvedQvLabels}
          />
        )}

        {currentView === "vote" && (
          <VotingView
            questionId={questionId as string}
            question={
              // For QVPlus rounds, replace the question's title/description with the
              // round-specific ones so each round can have its own framing.
              isQvPlusQuestion && activeRound
                ? {
                    ...question,
                    question: activeRound.voteTitle ?? question.question,
                    description: activeRound.voteDescription ?? question.description,
                  }
                : question
            }
            options={options}
            optionPositions={optionPositionsByGroup}
            categories={unifiedCategories}
            totalCredits={totalCredits}
            currCost={currCost}
            style={style}
            inputType={inputType}
            qvLabels={resolvedQvLabels}
            restrictVoteByCategory={RESTRICT_VOTE_BY_CATEGORY && isQvPlusQuestion}
            markOverBudgetVotes={MARK_OVER_BUDGET_VOTES && isQvPlusQuestion}
          />
        )}

        {currentView === "selection" && qvPlusUnified && activeRound && (
          <SelectionView
            questionId={questionId as string}
            // questionsSlice strips `options` to a string[] of IDs and stores the
            // full IBackendQsOptions[] (with descriptions) on `rawOptions`. Restore
            // it before handing to SelectionView, which reads option descriptions.
            question={{
              ...question,
              options: (question as any).rawOptions ?? question.options,
            } as IBackendQuestion}
            // Reuse the exact same IQsOption map + credit numbers as the vote view
            // so the selection cards render identically.
            options={options}
            state={qvPlusUnified}
            round={activeRound}
            totalCredits={totalCredits}
            currCost={currCost}
            qvLabels={resolvedQvLabels}
            onSetAnswer={handleQvPlusSetAnswer}
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
        selectionCtaLabel={selectionPrimaryLabel}
        voteBackLabel={voteBackLabel}
        organizeBackLabel={organizeBackLabel}
        onNextClick={
          currentView === "organize" 
            ? handleOrganizeNextClick 
            : currentView === "welcome" 
              ? navigateToNextPage 
              : currentView === "selection"
                ? handleSelectionPrimaryAction
                : undefined
        }
        onPreviousClick={
          // QVPlus is forward-only ACROSS rounds: never cross back into an earlier
          // round (that would need a snapshot-restore, not just a view change). But
          // within round 2+ the vote stage may step back to THIS round's organize.
          currentView === "vote"
            ? (isQvPlusQuestion && activeRoundIndex > 0
                ? (canReturnToRoundOrganize ? navigateToPreviousPage : undefined)
                : (canNavigateToPreviousQuestion ? handleVotePreviousQuestion : navigateToPreviousPage))
            : (currentView === "organize" && style !== "text")
              // Round 2+ organize: hide Previous — going back from here would cross
              // into the previous round.
              ? (isQvPlusQuestion && activeRoundIndex > 0 ? undefined : organizePreviousClick)
              : currentView === "selection"
                ? handleSelectionBack
                : undefined
        }
        onPrimaryAction={currentView === "vote" ? handleVotePrimaryAction : undefined}
        qvLabels={resolvedQvLabels}
      />
    </>
  );
};

export default QuadraticSurveyPage;
