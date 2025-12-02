import React, { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { useSearchParams } from "react-router-dom";
import { setUKey } from "../../../features/metadataSlice";
import { IQuestion, IQuestionGroup } from "../../../types/coreTypes";
import LikertQuestion from "../../../components/LikertQuestion";
import TextQuestion from "../../../components/TextQuestion";
import WelcomeView from "./WelcomeView";
import "./multiQuestionSurvey.css";
import { setLikertSelection, setTextAnswer } from "../../../features/unifiedResponsesSlice";
import { selectUnifiedSlice } from "../../../features/unifiedResponsesSelectors";

// Props interface for the MultiQuestionSurveyPage
interface MultiQuestionSurveyPageProps {
  onSubmit: () => Promise<void> | void;
  questionIds?: string[];
}

const resolveQuestionId = (question: IQuestion): string => {
  const explicitId = question.questionId ?? (question as { _id?: string })._id;
  if (!explicitId) return "";
  return typeof explicitId === "string" ? explicitId : String(explicitId);
};

const MultiQuestionSurveyPage: React.FC<MultiQuestionSurveyPageProps> = ({ onSubmit, questionIds }) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get('uKey');

  // Initialize data used in this page from the Redux store
  const questionsState = useAppSelector((state) => state.questions);
  const metadataState = useAppSelector((state) => state.metadata);
  const questions: IQuestion[] = useMemo(
    () => {
      const byId = questionsState.byId ?? {};
      const orderedIds: string[] = Array.isArray(questionIds) && questionIds.length > 0
        ? questionIds
        : Array.isArray((questionsState as any).order) && (questionsState as any).order.length > 0
          ? (questionsState as any).order
          : Object.keys(byId);

      const mapped = orderedIds
        .map((id: string) => (byId as any)[id])
        .filter(Boolean) as IQuestion[];

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

  const answerMaps = useMemo(() => {
    const likertSelections: Record<string, string> = {};
    const textAnswers: Record<string, string> = {};

    nonQvQuestions.forEach((question) => {
      const questionId = resolveQuestionId(question);
      const state = unifiedResponses.byQuestionId?.[questionId];
      if (!state) return;
      if (state.type === 'likert' && state.selection) {
        likertSelections[questionId] = state.selection;
      }
      if (state.type === 'text' && typeof state.text === 'string') {
        textAnswers[questionId] = state.text;
      }
    });

    return { likertSelections, textAnswers };
  }, [nonQvQuestions, unifiedResponses.byQuestionId]);

  const isSubmitEnabled = useMemo(() => {
    if (nonQvQuestions.length === 0) return false;
    const allReady = nonQvQuestions.every((question) => {
      const questionId = resolveQuestionId(question);
      const state = unifiedResponses.byQuestionId?.[questionId];
      if (!state) return false;
      if (state.type === 'likert') {
        return Boolean(state.selection);
      }
      if (state.type === 'text') {
        return Boolean(state.text && state.text.trim().length > 0);
      }
      return false;
    });
    return allReady;
  }, [nonQvQuestions, unifiedResponses.byQuestionId]);

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
        }
        return {
          id: questionId,
          type: question.type,
          ready,
          state,
        };
      });
      console.log('[DEBUG][MultiQuestionSurveyPage] submit state snapshot', {
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

  const renderQuestion = (question: IQuestion) => {
    switch (question.type) {
      case 'likert':
        return renderLikertQuestion(question);
      case 'text':
        return renderTextQuestion(question);
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
  
  if (!hasNonQVQuestions) {
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
        <button
          className="survey-submit-button"
          disabled={!isSubmitEnabled || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Responses'}
        </button>
      </div>
    </div>
  );
};

export default MultiQuestionSurveyPage;
