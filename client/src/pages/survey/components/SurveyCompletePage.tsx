import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resetUnifiedResponses } from '../../../features/unifiedResponsesSlice';
import { fetchMetaData } from '../../../features/metadataSlice';
import SubmittedResultsSection from './SubmittedResultsSection';
import '../../survey/survey.css';
import '../../home/home.css';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';

const SurveyCompletePage: React.FC = () => {
  useDocumentTitle('Survey Complete – QSurvey System');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: surveyIdParam } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const unifiedResponses = useAppSelector((state) => state.unifiedResponses);
  const metadata = useAppSelector((state) => state.metadata);
  const [showResults, setShowResults] = useState(false);

  const duplicateCode = (unifiedResponses?.error as any)?.code;
  const isDuplicateSubmission =
    unifiedResponses?.status === 'duplicate' || duplicateCode === 'DUPLICATE_SUBMISSION';
  const surveyId = metadata?.surveyId || surveyIdParam;

  useEffect(() => {
    if (!metadata?.surveyId && surveyIdParam) {
      dispatch(fetchMetaData(surveyIdParam));
    }
  }, [dispatch, metadata?.surveyId, surveyIdParam]);

  useEffect(() => {
    if (isDuplicateSubmission) {
      setShowResults(false);
    }
  }, [isDuplicateSubmission]);

  const derivedUuid = useMemo(() => {
    if (isDuplicateSubmission) {
      return undefined;
    }
    return (
      (unifiedResponses?.uuid as string | undefined) ||
      searchParams.get('uuid') ||
      undefined
    );
  }, [isDuplicateSubmission, unifiedResponses?.uuid, searchParams]);

  const handleSubmitNewResponse = () => {
    dispatch(resetUnifiedResponses());
    if (surveyId) {
      navigate(`/survey/${surveyId}`);
    } else {
      navigate('/');
    }
  };

  const handleCloseSurvey = () => {
    dispatch(resetUnifiedResponses());
    navigate('/');
  };

  const handleReturnHome = () => {
    dispatch(resetUnifiedResponses());
    navigate('/');
  };

  return (
    <div className="home-container">
      <div className="header">
        <div
          className="logo"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            dispatch(resetUnifiedResponses());
            navigate('/');
          }}
          title="Go to homepage"
        >
          Quadratic Survey System
        </div>
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
      </div>
      <div className="survey-complete-container">
        {/* <div className="survey-complete-header">
          <h1>Survey Complete</h1>
        </div> */}
        <div className="survey-complete-content">
          <div className="success-icon">✓</div>
          <h2>Thank you for completing the survey!</h2>
          <p>
            {isDuplicateSubmission
              ? 'It seems like you have submitted the survey somewhere else, in case you need to complete a new one click here.'
              : 'Your responses have been submitted successfully.'}
          </p>
          {isDuplicateSubmission ? (
            <>
              <button className="button" onClick={handleSubmitNewResponse}>
                Submit new response to the survey
              </button>
              <button
                className="secondary-btn"
                style={{ marginTop: '1rem' }}
                onClick={handleCloseSurvey}
              >
                Close this survey
              </button>
            </>
          ) : (
            <>
              <button className="button" onClick={handleReturnHome}>
                Return to Home
              </button>
              <button
                className="secondary-btn"
                style={{ marginTop: '1rem' }}
                onClick={() => setShowResults((prev) => !prev)}
                disabled={!derivedUuid || !metadata?.surveyId}
              >
                {showResults ? 'Hide Results' : 'See Results'}
              </button>
              {!derivedUuid && (
                <p className="status-text" style={{ marginTop: '0.75rem' }}>
                  Submitted results become available once your submission UUID is available.
                </p>
              )}
            </>
          )}
          {/* <p>If you were participating in a research study, please check with the researcher for next steps.</p> */}
        </div>
        {!isDuplicateSubmission &&
          showResults &&
          derivedUuid &&
          (metadata?.surveyId || surveyIdParam) && (
          <SubmittedResultsSection
            surveyId={(metadata?.surveyId || surveyIdParam) as string}
            uuid={derivedUuid}
            sKey={metadata?.sKey}
            uKey={metadata?.uKey}
            questionResponseIds={unifiedResponses?.questionResponseIds}
          />
        )}
      </div>
    </div>
  );
};

export default SurveyCompletePage;
