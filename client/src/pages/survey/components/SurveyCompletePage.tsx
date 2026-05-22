import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resetUnifiedResponses } from '../../../features/unifiedResponsesSlice';
import { fetchMetaData } from '../../../features/metadataSlice';
import SubmittedResultsSection from './SubmittedResultsSection';
import '../../survey/survey.css';
import '../../home/home.css';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { resolveQvLabels } from '../../../i18n/qvLabels';

const SurveyCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: surveyIdParam } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const unifiedResponses = useAppSelector((state) => state.unifiedResponses);
  const metadata = useAppSelector((state) => state.metadata);
  const qvLabels = useMemo(
    () => resolveQvLabels(metadata.locale),
    [metadata.locale],
  );
  useDocumentTitle(qvLabels.text.surveyCompleteTitle);
  const [showResults, setShowResults] = useState(false);

  const duplicateCode = (unifiedResponses?.error as any)?.code;
  const isDuplicateSubmission =
    unifiedResponses?.status === 'duplicate' || duplicateCode === 'DUPLICATE_SUBMISSION';
  const surveyId = metadata?.surveyId || surveyIdParam;
  const getQueryValue = (key: string): string | undefined => {
    const value = searchParams.get(key);
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };
  const queryUuid = getQueryValue('uuid');
  const canViewParticipantResults =
    metadata?.loaded === true && metadata.respondentsCanViewResults === true;

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

  useEffect(() => {
    if (!canViewParticipantResults) {
      setShowResults(false);
    }
  }, [canViewParticipantResults]);

  const derivedUuid = useMemo(() => {
    if (isDuplicateSubmission) {
      return undefined;
    }
    return (
      queryUuid ||
      (unifiedResponses?.uuid as string | undefined) ||
      undefined
    );
  }, [isDuplicateSubmission, queryUuid, unifiedResponses?.uuid]);

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
          title={qvLabels.text.goToHomepage}
        >
          {qvLabels.text.systemName}
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
          <h2>{qvLabels.text.surveyCompleteHeading}</h2>
          <p>
            {isDuplicateSubmission
              ? qvLabels.text.duplicateSubmitted
              : qvLabels.text.surveySubmitted}
          </p>
          {isDuplicateSubmission ? (
            <>
              <button className="button" onClick={handleSubmitNewResponse}>
                {qvLabels.text.submitNewResponse}
              </button>
              <button
                className="secondary-btn"
                style={{ marginTop: '1rem' }}
                onClick={handleCloseSurvey}
              >
                {qvLabels.text.closeSurvey}
              </button>
            </>
          ) : (
            <>
              <button className="button" onClick={handleReturnHome}>
                {qvLabels.text.returnHome}
              </button>
              {canViewParticipantResults && (
                <button
                  className="secondary-btn"
                  style={{ marginTop: '1rem' }}
                  onClick={() => setShowResults((prev) => !prev)}
                  disabled={!derivedUuid || !surveyId}
                >
                  {showResults ? qvLabels.text.hideResults : qvLabels.text.seeResults}
                </button>
              )}
              {canViewParticipantResults && !derivedUuid && (
                <p className="status-text" style={{ marginTop: '0.75rem' }}>
                  {qvLabels.text.resultsUuidUnavailable}
                </p>
              )}
            </>
          )}
          {/* <p>If you were participating in a research study, please check with the researcher for next steps.</p> */}
        </div>
        {!isDuplicateSubmission &&
          showResults &&
          canViewParticipantResults &&
          derivedUuid &&
          (metadata?.surveyId || surveyIdParam) && (
          <SubmittedResultsSection
            surveyId={(metadata?.surveyId || surveyIdParam) as string}
            uuid={derivedUuid}
            questionResponseIds={unifiedResponses?.questionResponseIds}
            surveyLocale={metadata.locale}
          />
        )}
      </div>
    </div>
  );
};

export default SurveyCompletePage;
