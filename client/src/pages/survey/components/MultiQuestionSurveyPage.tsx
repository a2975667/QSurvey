import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";
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
}

const MultiQuestionSurveyPage: React.FC<MultiQuestionSurveyPageProps> = ({ onSubmit }) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get('uKey');

  // Initialize data used in this page from the Redux store
  const questionsState = useAppSelector((state) => state.questions);
  const metadataState = useAppSelector((state) => state.metadata);
  const questions = Object.values(questionsState.byId || {});

  const unifiedResponses = useAppSelector(selectUnifiedSlice);
  const [currentView, setCurrentView] = useState<"welcome" | "questions">("questions");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group questions by group ID
  const questionGroups: { [groupId: string]: any[] } = {};
  const ungroupedQuestions: any[] = [];

  questions.forEach(question => {
    if (question.type !== 'qv') { // Only handle non-QV questions here
      const groupId = (question as any).groupId; // Use type assertion for now
      if (groupId) {
        if (!questionGroups[groupId]) {
          questionGroups[groupId] = [];
        }
        questionGroups[groupId].push(question);
      } else {
        ungroupedQuestions.push(question);
      }
    }
  });
  
  // Get the groups info from Redux
  const surveys = useAppSelector(state => state.surveys);
  const groups = surveys?.questionGroups || [];
  const responseStatus = useAppSelector(state => state.qsOptions.responseStatus);

  const dispatch = useDispatch<AppDispatch>();

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
      const questionId = (question as any)._id || (question as any).questionId;
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
    return nonQvQuestions.every((question) => {
      const questionId = (question as any)._id || (question as any).questionId;
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
  }, [nonQvQuestions, unifiedResponses.byQuestionId]);

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

  const renderLikertQuestion = (question: any) => {
    const questionId = question._id || question.questionId;
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

  const renderTextQuestion = (question: any) => {
    const questionId = question._id || question.questionId;
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

  const renderQuestion = (question: any) => {
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
  const hasNonQVQuestions = questions.some(q => q.type !== 'qv');
  
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
        {responseStatus?.error && (
          <div className="survey-error-message">
            {typeof responseStatus.error === 'string' 
              ? responseStatus.error 
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
