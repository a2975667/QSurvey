import React, { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { useSearchParams } from "react-router-dom";
import { setUKey } from "../../../features/metadataSlice";
import { IQuestion, IQuestionGroup } from "../../../types/coreTypes";
import LikertQuestion from "../../../components/LikertQuestion";
import SelectionQuestion from "../../../components/SelectionQuestion/SelectionQuestion";
import TextQuestion from "../../../components/TextQuestion";
import { MarkdownRenderer } from "../../../components/common/markdownRendererContract";
import WelcomeView from "./WelcomeView";
import "./multiQuestionSurvey.css";
import { setLikertSelection, setSelectionAnswer, setTextAnswer } from "../../../features/unifiedResponsesSlice";
import { selectUnifiedSlice } from "../../../features/unifiedResponsesSelectors";

// Props interface for the MultiQuestionSurveyPage
interface MultiQuestionSurveyPageProps {
  onSubmit: () => Promise<void> | void;
  questionIds?: string[];
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPreviousPage?: () => void;
  primaryActionLabel?: string;
}

const resolveQuestionId = (question: IQuestion): string => {
  const explicitId = question.questionId ?? (question as { _id?: string })._id;
  if (!explicitId) return "";
  return typeof explicitId === "string" ? explicitId : String(explicitId);
};

const normalizeSelectionList = (selected?: string[]) => {
  const base = Array.isArray(selected) ? selected : [];
  const seen = new Set<string>();
  const result: string[] = [];
  base.forEach((entry) => {
    if (typeof entry !== 'string' || entry.length === 0) return;
    if (!seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  });
  return result;
};

const isSelectionAnswerValid = (question: IQuestion, selected: string[]) => {
  const selectionMode = question.selectionMode === 'multi' ? 'multi' : 'single';
  const normalized = normalizeSelectionList(selected);
  const required = Boolean(question.required);
  const minSelections =
    typeof question.minSelections === 'number' ? question.minSelections : undefined;
  const maxSelections =
    typeof question.maxSelections === 'number' ? question.maxSelections : undefined;
  const options = Array.isArray(question.options) ? question.options : [];
  const exclusives = new Set(
    options
      .filter((opt: any) => opt?.isExclusive === true && opt?.optionId)
      .map((opt: any) => opt.optionId as string),
  );
  const hasExclusive = normalized.some((id) => exclusives.has(id));

  if (selectionMode === 'single') {
    if (normalized.length > 1) return false;
    if (required) return normalized.length === 1;
    return true;
  }

  if (hasExclusive) return true;

  const minRequired =
    typeof minSelections === 'number'
      ? minSelections
      : required
      ? 1
      : 0;

  if (normalized.length < minRequired) return false;
  if (typeof maxSelections === 'number' && normalized.length > maxSelections) return false;
  return true;
};

const MultiQuestionSurveyPage: React.FC<MultiQuestionSurveyPageProps> = ({
  onSubmit,
  questionIds,
  hasNextPage = false,
  hasPreviousPage = false,
  onPreviousPage,
  primaryActionLabel,
}) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get('uKey');

  // Initialize data used in this page from the Redux store
  const questionsState = useAppSelector((state) => state.questions);
  const metadataState = useAppSelector((state) => state.metadata);
  const questions: IQuestion[] = useMemo(
    () => {
      const byId = questionsState.byId ?? {};
      const hasExplicitOrder = Array.isArray(questionIds);
      const orderedIds: string[] = hasExplicitOrder
        ? questionIds
        : Array.isArray((questionsState as any).order) && (questionsState as any).order.length > 0
          ? (questionsState as any).order
          : Object.keys(byId);

      const mapped = orderedIds
        .map((id: string) => (byId as any)[id])
        .filter(Boolean) as IQuestion[];

      if (hasExplicitOrder) {
        return mapped;
      }

      if (mapped.length > 0) {
        return mapped;
      }

      return Object.values(byId ?? {});
    },
    [questionsState.byId, questionIds, questionsState],
  );

  const unifiedResponses = useAppSelector(selectUnifiedSlice);
  const [currentView, setCurrentView] = useState<"welcome" | "questions">("questions");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { questionGroups, ungroupedQuestions } = useMemo(() => {
    const grouped: Record<string, IQuestion[]> = {};
    const ungrouped: IQuestion[] = [];

    questions.forEach((question) => {
      if (question.type === "qv") return;
      if (question.type === "text_block") {
        ungrouped.push(question);
        return;
      }
      const groupId = question.groupId;
      if (groupId) {
        if (!grouped[groupId]) {
          grouped[groupId] = [];
        }
        grouped[groupId].push(question);
      } else {
        ungrouped.push(question);
      }
    });

    return { questionGroups: grouped, ungroupedQuestions: ungrouped };
  }, [questions]);
  
  // Get the groups info from Redux
  const surveys = useAppSelector(state => state.surveys);
  const groups = surveys?.questionGroups || [];
  const unifiedResponsesState = useAppSelector(selectUnifiedSlice);

  const dispatch = useAppDispatch();

  // Handle uKey if provided via URL
  useEffect(() => {
    if (uKey && metadataState && !metadataState.uKey) {
      dispatch(setUKey(uKey));
    }
  }, [uKey, dispatch, metadataState]);

  const nonQvQuestions: IQuestion[] = useMemo(
    () => questions.filter((q) => q.type !== 'qv'),
    [questions],
  );

  const answerableQuestions = useMemo(
    () =>
      nonQvQuestions.filter(
        (q) => q.type === 'likert' || q.type === 'text' || q.type === 'selection',
      ),
    [nonQvQuestions],
  );

  const answerMaps = useMemo(() => {
    const likertSelections: Record<string, string> = {};
    const textAnswers: Record<string, string> = {};
    const selectionAnswers: Record<string, string[]> = {};

    answerableQuestions.forEach((question) => {
      const questionId = resolveQuestionId(question);
      const state = unifiedResponses.byQuestionId?.[questionId];
      if (!state) return;
      if (state.type === 'likert' && state.selection) {
        likertSelections[questionId] = state.selection;
      }
      if (state.type === 'text' && typeof state.text === 'string') {
        textAnswers[questionId] = state.text;
      }
      if (state.type === 'selection' && Array.isArray(state.selectedOptionIds)) {
        selectionAnswers[questionId] = state.selectedOptionIds;
      }
    });

    return { likertSelections, textAnswers, selectionAnswers };
  }, [answerableQuestions, unifiedResponses.byQuestionId]);


  const isSubmitEnabled = useMemo(() => {
    if (answerableQuestions.length === 0) return true;
    const allReady = answerableQuestions.every((question) => {
      const questionId = resolveQuestionId(question);
      const state = unifiedResponses.byQuestionId?.[questionId];
      if (!state) return false;
      if (state.type === 'likert') {
        return Boolean(state.selection);
      }
      if (state.type === 'text') {
        return Boolean(state.text && state.text.trim().length > 0);
      }
      if (state.type === 'selection') {
        const selections = Array.isArray(state.selectedOptionIds)
          ? state.selectedOptionIds
          : [];
        return isSelectionAnswerValid(question, selections);
      }
      return false;
    });
    return allReady;
  }, [answerableQuestions, unifiedResponses.byQuestionId]);

  useEffect(() => {
    try {
      const debugSnapshot = nonQvQuestions.map((question) => {
        const questionId = resolveQuestionId(question);
        const state = unifiedResponses.byQuestionId?.[questionId];
        let ready = false;
        if (state?.type === 'likert') {
          ready = Boolean(state.selection);
        } else if (state?.type === 'text') {
          ready = Boolean(state.text && state.text.trim().length > 0);
        } else if (state?.type === 'selection') {
          const selections = Array.isArray(state.selectedOptionIds)
            ? state.selectedOptionIds
            : [];
          ready = isSelectionAnswerValid(question, selections);
        } else if (question.type === 'text_block') {
          ready = true;
        }
        return {
          id: questionId,
          type: question.type,
          ready,
          state,
        };
      });
      if (false) console.log('[DEBUG][MultiQuestionSurveyPage] submit state snapshot', {
        isSubmitEnabled,
        questions: debugSnapshot,
      });
    } catch {
      // Best-effort debug logging; ignore failures
    }
  }, [nonQvQuestions, unifiedResponses.byQuestionId, isSubmitEnabled]);

  const handleLikertAnswer = (questionId: string, selection: string) => {
    dispatch(setLikertSelection({ questionId, selection }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    dispatch(setTextAnswer({ questionId, text }));
  };

  const handleSelectionAnswer = (questionId: string, selectedOptionIds: string[]) => {
    dispatch(setSelectionAnswer({ questionId, selectedOptionIds }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLikertQuestion = (question: IQuestion) => {
    if (question.type !== 'likert') return null;
    const questionId = resolveQuestionId(question);
    const initialValue = answerMaps.likertSelections[questionId] || '';
    return (
      <div key={questionId} className="question-item">
        <LikertQuestion
          question={{
            _id: questionId,
            question: question.question,
            description: question.description,
            scale: question.scale || [],
            minLabel: question.minLabel,
            maxLabel: question.maxLabel
          }}
          onAnswer={handleLikertAnswer}
          initialSelection={initialValue}
        />
      </div>
    );
  };

  const renderTextQuestion = (question: IQuestion) => {
    if (question.type !== 'text') return null;
    const questionId = resolveQuestionId(question);
    const initialValue = answerMaps.textAnswers[questionId] || '';
    return (
      <div key={questionId} className="question-item">
        <TextQuestion
          question={{
            _id: questionId,
            question: question.question,
            description: question.description,
            multiline: question.multiline || false,
            maxLength: question.maxLength
          }}
          onAnswer={handleTextAnswer}
          initialText={initialValue}
        />
      </div>
    );
  };

  const renderSelectionQuestion = (question: IQuestion) => {
    if (question.type !== 'selection') return null;
    const questionId = resolveQuestionId(question);
    const initialSelection = normalizeSelectionList(
      answerMaps.selectionAnswers[questionId] || [],
    );
    const options = Array.isArray(question.options) ? question.options : [];
    return (
      <div key={questionId} className="question-item">
        <SelectionQuestion
          question={{
            _id: questionId,
            question: question.question,
            description: question.description,
            options: options as any,
            selectionMode: question.selectionMode === 'multi' ? 'multi' : 'single',
            displayControl: (question.displayControl as any) || 'radio',
            required: Boolean(question.required),
            minSelections: question.minSelections,
            maxSelections: question.maxSelections,
            randomizeOptions: Boolean(question.randomizeOptions),
            controlRuleThresholds: question.controlRuleThresholds,
          }}
          selectedOptionIds={initialSelection}
          onAnswer={handleSelectionAnswer}
        />
      </div>
    );
  };

  const renderTextBlock = (question: IQuestion) => {
    if (question.type !== 'text_block') return null;
    const questionId = resolveQuestionId(question);
    const content = typeof question.content === 'string' ? question.content : '';
    return (
      <div key={questionId} className="question-item text-block-item">
        <MarkdownRenderer
          content={content}
          className="text-block-content"
          allowImages
        />
      </div>
    );
  };

  const renderQuestion = (question: IQuestion) => {
    switch (question.type) {
      case 'likert':
        return renderLikertQuestion(question);
      case 'text':
        return renderTextQuestion(question);
      case 'selection':
        return renderSelectionQuestion(question);
      case 'text_block':
        return renderTextBlock(question);
      default:
        return null; // QV questions are handled separately
    }
  };
  
  if (currentView === "welcome") {
    const welcomeMode: "text" | "interactive" = "text";
    return (
      <WelcomeView 
        mode={welcomeMode} 
        onBeginClick={() => setCurrentView("questions")} 
      />
    );
  }
  
  // Check if we have any non-QV questions before rendering
  const hasNonQVQuestions = questions.some((q) => q.type !== 'qv');
  const isExplicitPage = Array.isArray(questionIds);
  
  if (!hasNonQVQuestions && !isExplicitPage) {
    return null; // This component doesn't handle QV questions
  }
  
  return (
    <div className="multi-question-survey-container">
      <div className="question-groups-container">
        {/* Render Grouped Questions */}
        {Object.entries(questionGroups).map(([groupId, groupQuestions]) => {
          const group = groups.find((g: IQuestionGroup) => g.id === groupId);
          if (!group) return null;
          
          return (
            <div key={groupId} className="question-group">
              <div className="group-header">
                <h2 className="group-title">{group.title}</h2>
                {group.description && (
                  <p className="group-description">{group.description}</p>
                )}
              </div>
              <div className="group-questions">
                {groupQuestions.map(renderQuestion)}
              </div>
            </div>
          );
        })}
        
        {/* Render Ungrouped Questions */}
        {ungroupedQuestions.length > 0 && (
          <div className="ungrouped-questions">
            {ungroupedQuestions.map(renderQuestion)}
          </div>
        )}
      </div>
      
      <div className="survey-navigation">
        {unifiedResponsesState.error && (
          <div className="survey-error-message">
            {typeof unifiedResponsesState.error === 'string' 
              ? unifiedResponsesState.error 
              : 'Unable to submit responses. Please try again.'}
          </div>
        )}
        <div className="survey-navigation__actions">
          {hasPreviousPage && onPreviousPage && (
            <button
              className="survey-secondary-button"
              disabled={isSubmitting}
              onClick={onPreviousPage}
              type="button"
            >
              Previous
            </button>
          )}
          <button
            className="survey-submit-button"
            disabled={!isSubmitEnabled || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting
              ? 'Submitting...'
              : primaryActionLabel || (hasNextPage ? 'Next' : 'Submit Responses')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiQuestionSurveyPage;
