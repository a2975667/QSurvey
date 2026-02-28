import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { AppDispatch } from '../../../app/store';
import { useAppSelector } from '../../../app/hooks';
import { IQuestion } from '../../../types/coreTypes';
import { QuestionPrompt, QuestionTitle } from '../../../components/QuestionInfo/questionPrompt';
import { DraggableArea } from '../../../components/DraggableItem/DraggableItem';
import {
  reorderApprovalOptions,
  toggleApprovalOption,
  syncApprovalNavigator,
  goToPreviousApprovalQuestion,
  markApprovalQuestionIncomplete,
} from '../../../features/unifiedResponsesSlice';
import {
  selectApprovalNavigator,
  selectApprovalQuestion,
  selectActiveApprovalQuestionId,
  selectQuestionResponseIds,
  selectUnifiedSlice,
} from '../../../features/unifiedResponsesSelectors';
import { SubmitApprovalQuestionResult, submitApprovalQuestion } from '../../../components/QsNavBar/submission';
import { setUKey } from '../../../features/metadataSlice';
import { resolveEffectiveApprovalLimit } from '../../../utils/approvalLimits';
import '../../../components/DraggableItem/DraggableItem.css';
import './approvalSurvey.css';

interface ApprovalSurveyPageProps {
  onCompleteLastQuestion?: (result?: SubmitApprovalQuestionResult) => void | Promise<void>;
  hasNextModuleAfterApproval?: boolean;
  questionIds?: string[];
}

interface ApprovalCardProps {
  optionId: string;
  optionName: string;
  description?: string;
  index: number;
  isApproved: boolean;
  onToggle: (optionId: string) => void;
}

const resolveQuestionId = (question: IQuestion): string => {
  const explicitId = question.questionId ?? (question as { _id?: string })._id;
  if (!explicitId) return '';
  return typeof explicitId === 'string' ? explicitId : String(explicitId);
};

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  optionId,
  optionName,
  description,
  index,
  isApproved,
  onToggle,
}) => {
  return (
    <Draggable draggableId={optionId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`approval-card item-wrapper vote ${snapshot.isDragging ? 'isDraggingtrue' : ''}`}
          onClick={() => onToggle(optionId)}
          data-testid={`approval-card-${optionId}`}
        >
          <div className="approval-card-inner">
            <div className="approval-drag-handle" {...provided.dragHandleProps}>
              <DraggableArea />
            </div>
            <div className="optionCard approval-card-body">
              <div className="organizer-info">
                <div className="organizer-info-title">{optionName || optionId}</div>
                {description ? <div className="organizer-info-des-light">{description}</div> : null}
              </div>
              <div className="approval-chip-row">
                <span className={`approval-chip ${isApproved ? 'approved' : 'pending'}`}>
                  {isApproved ? '✔ Approved' : 'Click to approve'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const ApprovalSurveyPage: React.FC<ApprovalSurveyPageProps> = ({
  onCompleteLastQuestion,
  hasNextModuleAfterApproval = false,
  questionIds,
}) => {
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get('uKey');
  const dispatch = useDispatch<AppDispatch>();
  const unifiedState = useAppSelector(selectUnifiedSlice);
  const metadata = useAppSelector((state) => state.metadata);
  const questionsState = useAppSelector((state) => state.questions);
  const questionsById = questionsState.byId ?? {};
  const approvalNavigator = useAppSelector(selectApprovalNavigator);
  const activeApprovalId = useAppSelector(selectActiveApprovalQuestionId);
  const questionResponseIds = useAppSelector(selectQuestionResponseIds);

  const approvalOrder = useMemo(() => {
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      return questionIds;
    }
    const orderedIds: string[] =
      Array.isArray((questionsState as any).order) && (questionsState as any).order.length > 0
        ? (questionsState as any).order
        : Object.keys(questionsById);
    return orderedIds
      .map((id: string) => (questionsById as any)[id])
      .filter((q: any) => q?.type === 'approval')
      .map((q: any) => resolveQuestionId(q))
      .filter((id): id is string => Boolean(id));
  }, [questionIds, questionsById, questionsState]);

  const approvalOrderKey = approvalOrder.join('|');
  const navigatorOrderKey = (approvalNavigator?.order || []).join('|');

  useEffect(() => {
    if (uKey && metadata && !metadata.uKey) {
      dispatch(setUKey(uKey));
    }
  }, [uKey, dispatch, metadata]);

  useEffect(() => {
    if (!approvalOrder.length) return;

    const completionCandidates = approvalOrder.filter((id) => Boolean(questionResponseIds?.[id]));
    const desiredCompletedSignature = completionCandidates.slice().sort().join('|');
    const navigatorCompletedSignature = Object.entries(approvalNavigator.completed || {})
      .filter(([, value]) => Boolean(value))
      .map(([id]) => id)
      .sort()
      .join('|');

    const needsOrderSync = navigatorOrderKey !== approvalOrderKey;
    const needsCompletionSync = desiredCompletedSignature !== navigatorCompletedSignature;
    const currentActive = approvalNavigator.activeQuestionId;
    const activeInvalid = currentActive && !approvalOrder.includes(currentActive);
    const desiredActive =
      approvalOrder.find((id) => !completionCandidates.includes(id)) ?? approvalOrder[0] ?? undefined;

    if (needsOrderSync || needsCompletionSync || activeInvalid) {
      dispatch(
        syncApprovalNavigator({
          order: approvalOrder,
          completed: completionCandidates,
          activeQuestionId: desiredActive,
        }),
      );
    }
  }, [
    approvalOrder,
    approvalOrderKey,
    approvalNavigator.completed,
    approvalNavigator.activeQuestionId,
    dispatch,
    navigatorOrderKey,
    questionResponseIds,
  ]);

  const effectiveQuestionId =
    (activeApprovalId && approvalOrder.includes(activeApprovalId) ? activeApprovalId : undefined) ||
    approvalOrder[0];

  const question: IQuestion | undefined = effectiveQuestionId
    ? (questionsById as any)[effectiveQuestionId] ||
      approvalOrder
        .map((id) => (questionsById as any)[id])
        .find((q: any) => (q?.questionId || q?._id) === effectiveQuestionId)
    : undefined;

  const approvalState = useAppSelector((state) =>
    effectiveQuestionId ? selectApprovalQuestion(state as any, effectiveQuestionId) : undefined,
  );

  const optionOrder = approvalState?.order ?? [];
  const options = approvalState?.options ?? {};
  const approvedSet = approvalState?.approvals ?? [];
  const optionCount = optionOrder.length || Object.keys(options).length;
  const effectiveMaxApprovals = useMemo(
    () =>
      resolveEffectiveApprovalLimit({
        optionCount,
        maxApprovals:
          typeof (question as any)?.maxApprovals === 'number'
            ? (question as any).maxApprovals
            : approvalState?.maxApprovals,
        unlimitedApprovals:
          (question as any)?.unlimitedApprovals === true ||
          approvalState?.unlimitedApprovals === true,
      }),
    [approvalState?.maxApprovals, approvalState?.unlimitedApprovals, optionCount, question],
  );
  const selectedCountLabel =
    typeof effectiveMaxApprovals === 'number'
      ? `Selected ${approvedSet.length} of ${effectiveMaxApprovals} approvals`
      : `Selected ${approvedSet.length} approvals`;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showZeroApprovalModal, setShowZeroApprovalModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  useEffect(() => {
    setLimitError(null);
  }, [effectiveQuestionId]);

  const isLastNavigatorQuestion =
    effectiveQuestionId && approvalOrder.length > 0
      ? approvalOrder[approvalOrder.length - 1] === effectiveQuestionId
      : false;
  const isFirstNavigatorQuestion = effectiveQuestionId ? approvalOrder[0] === effectiveQuestionId : true;

  const primaryLabel = isLastNavigatorQuestion
    ? hasNextModuleAfterApproval
      ? 'Next Module →'
      : 'Submit survey'
    : 'Next Question →';

  const handleReorder = useCallback(
    (nextOrder: string[]) => {
      if (!effectiveQuestionId) return;
      dispatch(
        reorderApprovalOptions({
          questionId: effectiveQuestionId,
          order: nextOrder,
          at: Date.now(),
        }),
      );
    },
    [dispatch, effectiveQuestionId],
  );

  const handleToggle = useCallback(
    (optionId: string) => {
      if (!effectiveQuestionId || !optionId) return;
      const isAlreadyApproved = approvedSet.includes(optionId);
      if (
        !isAlreadyApproved &&
        typeof effectiveMaxApprovals === 'number' &&
        approvedSet.length >= effectiveMaxApprovals
      ) {
        const label = effectiveMaxApprovals === 1 ? 'option' : 'options';
        setLimitError(`You can approve up to ${effectiveMaxApprovals} ${label} for this question.`);
        return;
      }
      setLimitError(null);
      dispatch(toggleApprovalOption({ questionId: effectiveQuestionId, optionId, at: Date.now() }));
    },
    [approvedSet, dispatch, effectiveMaxApprovals, effectiveQuestionId],
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const nextOrder = Array.from(optionOrder);
    const [moved] = nextOrder.splice(result.source.index, 1);
    nextOrder.splice(result.destination.index, 0, moved);
    handleReorder(nextOrder);
  };

  const performSubmit = useCallback(async () => {
    if (!effectiveQuestionId || !approvalState) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitApprovalQuestion({
        dispatch,
        questionId: effectiveQuestionId,
        approvalState,
        unifiedState,
        metadata: {
          surveyId: metadata.surveyId,
          sKey: metadata.sKey,
          uKey: metadata.uKey,
        },
      });

      if (isLastNavigatorQuestion) {
        await onCompleteLastQuestion?.(result);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
      setShowZeroApprovalModal(false);
      setPendingAction(null);
    }
  }, [
    approvalState,
    dispatch,
    effectiveQuestionId,
    isLastNavigatorQuestion,
    metadata.sKey,
    metadata.surveyId,
    metadata.uKey,
    onCompleteLastQuestion,
    unifiedState,
  ]);

  const handlePrimaryAction = () => {
    if (!effectiveQuestionId || !approvalState) return;
    const hasApprovals = (approvalState.approvals || []).length > 0;
    if (!hasApprovals) {
      setPendingAction(() => performSubmit);
      setShowZeroApprovalModal(true);
      return;
    }
    performSubmit();
  };

  const handlePrevious = () => {
    if (!effectiveQuestionId) return;
    dispatch(markApprovalQuestionIncomplete(effectiveQuestionId));
    dispatch(goToPreviousApprovalQuestion());
  };

  const currentIndex = approvalOrder.findIndex((id) => id === effectiveQuestionId);
  const isSingleQuestion = approvalOrder.length === 1;
  const progressLabel =
    approvalOrder.length > 0 && currentIndex >= 0 && !isSingleQuestion
      ? `Approval question ${currentIndex + 1} of ${approvalOrder.length}`
      : '';

  if (!effectiveQuestionId || !question || !approvalState) {
    return (
      <div className="Container container-width-limited">
        <div className="header">
          <div className="title">Survey Error</div>
        </div>
        <div className="container-narrow" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Sorry, this approval question could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="Container container-width-limited">
        <div className="container-width-80 title-bar">
          <div className="surveyQuestionTitle">
            <QuestionTitle question={question} />
          </div>
        </div>
        <div className="container-width-80">
          <QuestionPrompt question={question} instructions={false} />
          <p className="organize-instructions approval-instructions">
            Reorder options however you like, then tap a card to approve or un-approve it.
          </p>
          <p className="approval-limit-caption">{selectedCountLabel}</p>
        </div>

        <div className="container-width-80 approval-options-container">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="approval-section">
              <div className="approval-section-header">Options</div>
              <Droppable droppableId="approval-options">
                {(provided) => (
                  <div className="approval-options-list" ref={provided.innerRef} {...provided.droppableProps}>
                    {optionOrder.map((optionId, index) => {
                      const option = options[optionId];
                      if (!option) return null;
                      return (
                        <ApprovalCard
                          key={optionId}
                          optionId={optionId}
                          optionName={option.optionName || optionId}
                          description={option.description}
                          index={index}
                          isApproved={approvedSet.includes(optionId)}
                          onToggle={handleToggle}
                        />
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>
      </div>

      <div className="approval-nav-spacer" aria-hidden="true" />

      <div className="nav-panel">
        <div className="nav-section left">
          {!isSingleQuestion && (
            <button
              className="nav-button"
              onClick={handlePrevious}
              disabled={isFirstNavigatorQuestion || isSubmitting}
            >
              ← Previous Question
            </button>
          )}
        </div>
        <div className="nav-section center">
          {isLastNavigatorQuestion && !hasNextModuleAfterApproval ? (
            <button
              className={`nav-button primary ${isSubmitting ? 'disabled' : ''}`}
              onClick={handlePrimaryAction}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit survey'}
            </button>
          ) : (
            <div className="phase-display">{progressLabel}</div>
          )}
          {limitError && <div className="nav-panel-hint-message error">{limitError}</div>}
          {error && <div className="nav-panel-hint-message error">{error}</div>}
        </div>
        <div className="nav-section right">
          {!isLastNavigatorQuestion || hasNextModuleAfterApproval ? (
            <button
              className={`nav-button primary ${isSubmitting ? 'disabled' : ''}`}
              onClick={handlePrimaryAction}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : primaryLabel}
            </button>
          ) : null}
        </div>
      </div>

      {showZeroApprovalModal && (
        <div className="approval-modal-backdrop" data-testid="approval-zero-modal">
          <div className="approval-modal">
            <div className="approval-modal-title">Are you sure you want to approve none?</div>
            <div className="approval-modal-actions">
              <button
                className="nav-button"
                onClick={() => {
                  setShowZeroApprovalModal(false);
                  setPendingAction(null);
                }}
              >
                Go Back
              </button>
              <button
                className="nav-button primary"
                onClick={() => {
                  const action = pendingAction;
                  if (action) {
                    action();
                  } else {
                    setShowZeroApprovalModal(false);
                  }
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalSurveyPage;
