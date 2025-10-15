import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resetQsOptions } from '../../../features/qsOptionsSlice';
import { fetchMetaData } from '../../../features/metadataSlice';
import SubmittedResultsSection from './SubmittedResultsSection';
import '../../survey/survey.css';
import '../../home/home.css';

const SurveyCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: surveyIdParam } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const responseStatus = useAppSelector((state) => state.qsOptions.responseStatus);
  const metadata = useAppSelector((state) => state.metadata);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!metadata?.surveyId && surveyIdParam) {
      dispatch(fetchMetaData(surveyIdParam));
    }
  }, [dispatch, metadata?.surveyId, surveyIdParam]);

  const derivedUuid = useMemo(() => {
    return (
      (responseStatus?.uuid as string | undefined) ||
      searchParams.get('uuid') ||
      (typeof window !== 'undefined' ? localStorage.getItem('qv_last_uuid') || undefined : undefined)
    );
  }, [responseStatus?.uuid, searchParams]);

  return (
    <div className="home-container">
      <div className="header">
        <div
          className="logo"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            dispatch(resetQsOptions());
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
          <p>Your responses have been submitted successfully.</p>
          <button 
            className="button" 
            onClick={() => {
              dispatch(resetQsOptions());
              navigate('/');
            }}
          >
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
          {/* <p>If you were participating in a research study, please check with the researcher for next steps.</p> */}
        </div>
        {showResults && derivedUuid && (metadata?.surveyId || surveyIdParam) && (
          <SubmittedResultsSection
            surveyId={(metadata?.surveyId || surveyIdParam) as string}
            uuid={derivedUuid}
            sKey={metadata?.sKey}
            uKey={metadata?.uKey}
            questionResponseIds={responseStatus?.questionResponseIds || {}}
          />
        )}
      </div>
    </div>
  );
};

export default SurveyCompletePage;
