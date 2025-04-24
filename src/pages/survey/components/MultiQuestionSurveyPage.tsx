import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";
import { useSearchParams } from "react-router-dom";
import { setUKey } from "../../../features/metadataSlice";
import { IQuestionGroup } from "../../../types/coreTypes";
import LikertQuestion from "../../../components/LikertQuestion";
import TextQuestion from "../../../components/TextQuestion";
import WelcomeView from "./WelcomeView";
import "./multiQuestionSurvey.css";

// Props interface for the MultiQuestionSurveyPage
interface MultiQuestionSurveyPageProps {
  onSubmit: (responses: { [questionId: string]: any }) => void;
}

interface ResponseData {
  [questionId: string]: {
    questionType: string;
    value: string | { [key: string]: any };
  };
}

const MultiQuestionSurveyPage: React.FC<MultiQuestionSurveyPageProps> = ({ onSubmit }) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const uKey = searchParams.get('uKey');
  
  // Initialize data used in this page from the Redux store
  const survey = useAppSelector((state) => state);
  const questions = Object.values(survey.questions.byId || {});
  
  // State for responses
  const [responses, setResponses] = useState<ResponseData>({});
  const [currentView, setCurrentView] = useState<"welcome" | "questions">("welcome");
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);
  
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
  
  // Get access to the dispatch function for Redux actions
  const dispatch = useDispatch<AppDispatch>();
  
  // Handle uKey if provided via URL
  useEffect(() => {
    if (uKey && survey.metadata && !survey.metadata.uKey) {
      dispatch(setUKey(uKey));
    }
  }, [uKey, dispatch, survey.metadata]);
  
  // Check if all required questions are answered
  useEffect(() => {
    // For now, all questions are required
    const allQuestions = questions.filter(q => q.type !== 'qv');
    const answeredQuestions = Object.keys(responses);
    
    setIsSubmitEnabled(allQuestions.length > 0 && answeredQuestions.length === allQuestions.length);
  }, [responses, questions]);
  
  const handleLikertAnswer = (questionId: string, selection: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        questionType: 'likert',
        value: selection
      }
    }));
  };
  
  const handleTextAnswer = (questionId: string, text: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        questionType: 'text',
        value: text
      }
    }));
  };
  
  const handleSubmit = () => {
    onSubmit(responses);
  };
  
  const renderLikertQuestion = (question: any) => {
    const initialValue = responses[question._id]?.value || '';
    
    return (
      <div key={question._id} className="question-item">
        <LikertQuestion
          question={{
            _id: question._id,
            question: question.question,
            description: question.description,
            scale: question.scale || [],
            minLabel: question.minLabel,
            maxLabel: question.maxLabel
          }}
          onAnswer={handleLikertAnswer}
          initialSelection={initialValue as string}
        />
      </div>
    );
  };
  
  const renderTextQuestion = (question: any) => {
    const initialValue = responses[question._id]?.value || '';
    
    return (
      <div key={question._id} className="question-item">
        <TextQuestion
          question={{
            _id: question._id,
            question: question.question,
            description: question.description,
            multiline: question.multiline || false,
            maxLength: question.maxLength
          }}
          onAnswer={handleTextAnswer}
          initialText={initialValue as string}
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
    return (
      <WelcomeView 
        style="text" 
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
        <button
          className="survey-submit-button"
          disabled={!isSubmitEnabled}
          onClick={handleSubmit}
        >
          Submit Responses
        </button>
      </div>
    </div>
  );
};

export default MultiQuestionSurveyPage;