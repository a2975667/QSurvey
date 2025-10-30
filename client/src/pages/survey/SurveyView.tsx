import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../app/hooks';
import { fetchMetaData, setSKey, setUKey, setUuid } from '../../features/metadataSlice';
import { fetchSampleQuestions } from '../../features/questionsSlice';
import { initQsOptions } from '../../features/qsOptionsSlice';
import { AppDispatch } from '../../app/store';
import { QuadraticSurveyPage } from './components';
import MultiQuestionSurveyPage from './components/MultiQuestionSurveyPage';
import { fetchSurveyData } from '../../features/surveysSlice';
import Banner from '../../components/Banner';
import './survey.css';
import { submitBatchQuestionResponses, fetchSurveyResponseByUUID } from '../../features/options/api/options.api';
import { buildNonQvBatchPayload } from '../../utils/submissionBuilder';
import { selectUnifiedSlice } from '../../features/unifiedResponsesSelectors';

// Define survey styles and input types
type SurveyStyle = "text" | "interactive";
type InputType = "wheel" | "dropdown";

interface SurveyConfig {
  style: SurveyStyle;
  inputType: InputType;
}

const SurveyView = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  
  // Get parameters from query params
  const mode = searchParams.get('mode');
  const input = searchParams.get('input');
  const sKey = searchParams.get('sKey');
  const uKey = searchParams.get('uKey');
  const uuid = searchParams.get('uuid');
  
  // Create config object with defaults
  const config: SurveyConfig = {
    style: mode === 'text' ? 'text' : 'interactive',
    inputType: input === 'wheel' ? 'wheel' : 'dropdown'
  };
  const auth = useAppSelector(state => state.auth);
  
  // Load survey data
  useEffect(() => {
    if (id) {
      // Fetch all necessary survey data
      dispatch(fetchMetaData(id));
      dispatch(fetchSampleQuestions(id));
      dispatch(fetchSurveyData(id));
      
      // Store keys from URL parameters to metadata if they exist
      if (sKey) {
        dispatch(setSKey(sKey));
      }
      
      if (uKey) {
        dispatch(setUKey(uKey));
      }
      
      // UUID is handled separately for resuming sessions, if needed
      if (uuid) {
        dispatch(setUuid(uuid));
      }
    }
  }, [dispatch, id, sKey, uKey, uuid]);
  
  const navigate = useNavigate();
  const metadata = useAppSelector(state => state.metadata);
  const qsOptions = useAppSelector(state => state.qsOptions);
  const questions = useAppSelector(state => state.questions);
  const unifiedState = useAppSelector(selectUnifiedSlice);
  
  // Check if this survey has non-QV questions
  const [hasNonQVQuestions, setHasNonQVQuestions] = useState(false);
  const [hasQVQuestions, setHasQVQuestions] = useState(false);
  const [resumeHydrated, setResumeHydrated] = useState(false);
  
  // Initialize qsOptions once questions are loaded
  useEffect(() => {
    if (questions.loaded) {
      const questionItems = Object.values(questions.byId || {});
      setHasQVQuestions(questionItems.some(q => q.type === 'qv' || !q.type));
      setHasNonQVQuestions(questionItems.some(q => q.type === 'likert' || q.type === 'text'));
      
      if (hasQVQuestions) {
        dispatch(initQsOptions(questions));
      }
    }
  }, [questions.loaded, dispatch, questions, hasQVQuestions]);

  useEffect(() => {
    if (
      !resumeHydrated &&
      metadata.loaded &&
      metadata.resumeUuid &&
      metadata.surveyId
    ) {
      dispatch(
        fetchSurveyResponseByUUID({
          uuid: metadata.resumeUuid,
          surveyId: metadata.surveyId,
          sKey: metadata.sKey,
          uKey: metadata.uKey,
        }),
      );
      setResumeHydrated(true);
    }
  }, [dispatch, metadata.loaded, metadata.resumeUuid, metadata.surveyId, metadata.sKey, metadata.uKey, resumeHydrated]);

  if (!metadata.loaded || !qsOptions.loaded || !questions.loaded) {
    return (
      <>
        <Banner title="Quadratic Survey System">
          <div className="auth-section">
            <span className="user-status">{auth.isAuthenticated ? auth.user?.email || 'User' : 'Guest'}</span>
            {!auth.isAuthenticated && (
              <button className="login-button" onClick={() => navigate('/login')}>
                Login
              </button>
            )}
          </div>
        </Banner>
        <div className="loading-container">
          <div className="loading-content">
            <div>Loading survey...</div>
          </div>
        </div>
      </>
    );
  }
  
  interface ResponseData {
    questionType: string;
    value: string | { [key: string]: any };
  }

  const handleNonQVSubmit = async () => {
    const surveyId = metadata.surveyId || id || '';

    if (!surveyId) {
      console.error('Survey ID missing when attempting to submit responses');
      alert('Unable to submit responses because the survey is not loaded correctly.');
      return;
    }

    const nonQvQuestionIds = Object.values(questions.byId || {})
      .filter((question) => question.type === 'likert' || question.type === 'text')
      .map((question) => (question as any)._id || question.questionId);

    const { responses: formattedResponses, unanswered } = buildNonQvBatchPayload({
      unifiedState,
      questionIds: nonQvQuestionIds,
    });

    if (unanswered.length > 0) {
      alert('Please answer all required questions before submitting.');
      return;
    }

    if (formattedResponses.length === 0) {
      alert('No responses to submit.');
      return;
    }

    const batchPayload = {
      surveyId,
      responses: formattedResponses,
      uuid: qsOptions.responseStatus?.uuid || metadata.resumeUuid,
      surveyResponseId: qsOptions.responseStatus?.surveyResponseId || undefined,
      sKey: metadata.sKey,
      uKey: metadata.uKey,
    };

    const result = await dispatch(submitBatchQuestionResponses(batchPayload));

    if (submitBatchQuestionResponses.fulfilled.match(result)) {
      navigate(`/survey/${surveyId}/complete`);
    } else {
      const errorMessage = (result as any)?.payload?.message || 'Failed to submit responses. Please try again.';
      console.error('Failed to submit batch responses:', result);
      alert(errorMessage);
    }
  };

  return (
    <>
      <Banner title="Quadratic Survey System">
        <div className="auth-section">
          <span className="user-status">{auth.isAuthenticated ? auth.user?.email || 'User' : 'Guest'}</span>
          {!auth.isAuthenticated && (
            <button className="login-button" onClick={() => navigate('/login')}>
              Login
            </button>
          )}
          {auth.isAuthenticated && (
            <button className="projects-button" onClick={() => navigate('/designer')}>
              My Projects
            </button>
          )}
        </div>
      </Banner>
      
      <div className="survey-container">
      
      {/* Show QV questions if there are any */}
      {hasQVQuestions && (
        <QuadraticSurveyPage style={config.style} inputType={config.inputType} />
      )}
      
      {/* Show non-QV questions if there are any */}
      {hasNonQVQuestions && (
        <MultiQuestionSurveyPage onSubmit={handleNonQVSubmit} />
      )}
      
      {/* Show an error if there are no questions */}
      {!hasQVQuestions && !hasNonQVQuestions && questions.loaded && (
        <div className="no-questions-container">
          <h2>No questions found</h2>
          <p>This survey doesn't have any questions yet.</p>
        </div>
      )}
    </div>
    </>
  );
};

export default SurveyView;
