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
import { API_PREFIX } from '../../config';
import './survey.css';

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
  
  // Check if this survey has non-QV questions
  const [hasNonQVQuestions, setHasNonQVQuestions] = useState(false);
  const [hasQVQuestions, setHasQVQuestions] = useState(false);
  
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
  
  if (!metadata.loaded || !qsOptions.loaded || !questions.loaded) {
    return (
      <div className="loading-container">
        <div className="header">
          <div className="logo">Quadratic Survey System</div>
          <div className="auth-section">
            <span className="user-status">{auth.isAuthenticated ? auth.user?.email || 'User' : 'Guest'}</span>
            {!auth.isAuthenticated && (
              <Link to="/login" className="login-link">Login</Link>
            )}
          </div>
        </div>
        <div className="loading-content">
          <div>Loading survey...</div>
        </div>
      </div>
    );
  }
  
  interface ResponseData {
    questionType: string;
    value: string | { [key: string]: any };
  }

  const handleNonQVSubmit = async (responses: { [questionId: string]: ResponseData }) => {
    try {
      console.log('Submitting non-QV responses:', responses);
      
      // Format the responses for the backend
      const formattedResponses = Object.entries(responses).map(([questionId, data]) => {
        const responseData: any = {
          questionId,
          questionType: data.questionType
        };
        
        if (data.questionType === 'likert') {
          responseData.selection = data.value;
        } else if (data.questionType === 'text') {
          responseData.text = data.value;
        }
        
        return responseData;
      });
      
      // Submit non-QV responses
      const responseData = {
        surveyId: id,
        responses: formattedResponses
      };
      
      const token = auth.token || localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_PREFIX}/response/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(responseData)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Navigate to completion page
        navigate(`/survey/${id}/complete`);
      } else {
        console.error('Failed to submit survey responses:', await response.text());
        alert('There was an error submitting your responses. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting survey responses:', error);
      alert('There was an error submitting your responses. Please try again.');
    }
  };

  return (
    <div>
      <div className="header">
        <div className="logo">Quadratic Survey System</div>
        <div className="auth-section">
          <span className="user-status">{auth.isAuthenticated ? auth.user?.email || 'User' : 'Guest'}</span>
          {!auth.isAuthenticated && (
            <Link to="/login" className="login-link">Login</Link>
          )}
          {auth.isAuthenticated && (
            <Link to="/designer" className="projects-link">My Projects</Link>
          )}
        </div>
      </div>
      
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
  );
};

export default SurveyView;