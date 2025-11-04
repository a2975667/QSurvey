import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMetaData, setSKey, setUKey, setUuid } from '../../features/metadataSlice';
import { fetchSampleQuestions } from '../../features/questionsSlice';
import { QuadraticSurveyPage } from './components';
import ResumeModal from '../../components/ResumeModal/ResumeModal';
import MultiQuestionSurveyPage from './components/MultiQuestionSurveyPage';
import { fetchSurveyData } from '../../features/surveysSlice';
import Banner from '../../components/Banner';
import './survey.css';
import { submitBatchQuestionResponses, fetchSurveyResponseByUUID } from '../../features/options/api/options.api';
import { buildNonQvBatchPayload } from '../../utils/submissionBuilder';
import { selectUnifiedSlice } from '../../features/unifiedResponsesSelectors';
import { seedQvQuestion, qvSetBinsConfig } from '../../features/unifiedResponsesSlice';
import { completeSurveySubmission, SubmitQvQuestionResult } from '../../components/QsNavBar/submission';
import { IQuestion } from '../../types/coreTypes';
import { IBackendQsOptions } from '../../types/backendTypes';

// Define survey styles and input types
type SurveyStyle = "text" | "interactive";
type InputType = "wheel" | "dropdown";

interface SurveyConfig {
  style: SurveyStyle;
  inputType: InputType;
}

const resolveQuestionId = (question: IQuestion): string => {
  const explicitId = question.questionId ?? (question as { _id?: string })._id;
  if (!explicitId) return '';
  return typeof explicitId === 'string' ? explicitId : String(explicitId);
};

const resolveTotalCredits = (question: IQuestion): number => {
  if (typeof question.totalCredits === 'number') {
    return question.totalCredits;
  }
  const withSettings = question as { setting?: { totalCredits?: number } };
  const fromSetting = withSettings.setting?.totalCredits;
  return typeof fromSetting === 'number' ? fromSetting : 0;
};

const SurveyView = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const metadata = useAppSelector(state => state.metadata);
  const questions = useAppSelector(state => state.questions);
  const unifiedState = useAppSelector(selectUnifiedSlice);
  
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
  
  // Build a stable resume link if identifiers are present (declare before effects)
  const buildResumeLink = (): string | null => {
    const surveyIdVal = metadata.surveyId || id || '';
    const uuidVal = unifiedState.uuid || metadata.resumeUuid || '';
    if (!surveyIdVal || !uuidVal) return null;
    const url = new URL(typeof window !== 'undefined' ? window.location.href : `https://local/${surveyIdVal}`);
    url.pathname = `/survey/${surveyIdVal}`;
    url.search = '';
    url.searchParams.set('uuid', uuidVal);
    if (metadata.sKey) url.searchParams.set('sKey', metadata.sKey);
    if (metadata.uKey) url.searchParams.set('uKey', metadata.uKey);
    return url.toString();
  };

  // Load survey data
  useEffect(() => {
    if (id) {
      // Fetch all necessary survey data (avoid re-fetch if already loaded in store)
      if (!metadata.loaded) {
        dispatch(fetchMetaData(id));
      }
      if (!questions.loaded) {
        dispatch(fetchSampleQuestions(id));
      }
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
  }, [dispatch, id, sKey, uKey, uuid, metadata.loaded, questions.loaded]);

  // Show resume modal on first load if requested by prior session
  useEffect(() => {
    const link = buildResumeLink();
    setResumeLink(link);
    const flag = typeof window !== 'undefined' ? localStorage.getItem('qv_show_resume_popup') : null;
    if (flag === 'true' && link) {
      setShowResumeModal(true);
      try { localStorage.removeItem('qv_show_resume_popup'); } catch {}
    }
  }, [metadata.surveyId, unifiedState.uuid, metadata.resumeUuid, metadata.sKey, metadata.uKey, id]);

  // beforeunload: prompt and persist link for user convenience
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const link = buildResumeLink();
      if (!link) return;
      try {
        localStorage.setItem('qv_resume_link', link);
        localStorage.setItem('qv_show_resume_popup', 'true');
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(link).catch(() => {});
        }
      } catch {}
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [metadata.surveyId, unifiedState.uuid, metadata.resumeUuid, id, metadata.sKey, metadata.uKey]);
  
  
  
  // Check if this survey has non-QV questions
  const [hasNonQVQuestions, setHasNonQVQuestions] = useState(false);
  const [hasQVQuestions, setHasQVQuestions] = useState(false);
  const [resumeHydrated, setResumeHydrated] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeLink, setResumeLink] = useState<string | null>(null);
  const seededQuestionsRef = useRef<Set<string>>(new Set());
  const [activeModule, setActiveModule] = useState<'qv' | 'nonQv'>('qv');

  // Seed unified QV state once questions are loaded
  useEffect(() => {
    if (!questions.loaded) {
      seededQuestionsRef.current.clear();
      return;
    }

    const questionItems: IQuestion[] = Object.values(questions.byId ?? {});
    const qvItems = questionItems.filter((q) => (q.type ?? 'qv') === 'qv');
    const nonQvItems = questionItems.filter((q) => q.type === 'likert' || q.type === 'text');

    setHasQVQuestions(qvItems.length > 0);
    setHasNonQVQuestions(nonQvItems.length > 0);

    if (qvItems.length === 0 && nonQvItems.length > 0) {
      setActiveModule('nonQv');
    }

    qvItems.forEach((question) => {
      const questionId = resolveQuestionId(question);
      if (!questionId) return;

      if (seededQuestionsRef.current.has(questionId)) {
        return;
      }

      const existing = unifiedState.byQuestionId?.[questionId];
      if (existing && existing.type === 'qv') {
        seededQuestionsRef.current.add(questionId);
        return;
      }

      const rawOptions = Array.isArray(question.rawOptions) ? question.rawOptions : [];
      type SeedOption = {
        optionId: string;
        optionName?: string;
        groupPosition: number;
        globalPosition: number;
        votes: number;
      };

      const optionsPayload: SeedOption[] = (rawOptions as IBackendQsOptions[])
        .filter((option) => typeof option?.optionId === 'string' && option.optionId.length > 0)
        .map((option, idx) => ({
          optionId: option.optionId,
          optionName: option.optionName,
          groupPosition: idx,
          globalPosition: idx,
          votes: 0,
        }));

      const userDefined = ['Positive', 'Neutral', 'Negative'];
      const categoriesOrder = ['Undecided', ...userDefined, 'Skip'];

      dispatch(
        seedQvQuestion({
          questionId,
          totalCredits: resolveTotalCredits(question),
          categories: categoriesOrder,
          options: optionsPayload,
        }),
      );

      dispatch(
        qvSetBinsConfig({
          questionId,
          bins: {
            hasUndecided: true,
            hasSkip: true,
            userDefined,
          },
          categoriesOrder,
        }),
      );

      seededQuestionsRef.current.add(questionId);
    });
  }, [questions.loaded, questions.byId, unifiedState.byQuestionId, dispatch]);

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

  if (!metadata.loaded || !questions.loaded) {
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
  
  const handleNonQVSubmit = async () => {
    const surveyId = metadata.surveyId || id || '';

    if (!surveyId) {
      console.error('Survey ID missing when attempting to submit responses');
      alert('Unable to submit responses because the survey is not loaded correctly.');
      return;
    }

    const nonQvQuestionIds = (Object.values(questions.byId ?? {}) as IQuestion[])
      .filter((question) => question.type === 'likert' || question.type === 'text')
      .map((question) => resolveQuestionId(question))
      .filter((questionId): questionId is string => Boolean(questionId));

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
      uuid: unifiedState.uuid || metadata.resumeUuid,
      surveyResponseId: unifiedState.surveyResponseId || undefined,
      sKey: metadata.sKey,
      uKey: metadata.uKey,
    };

    const result = await dispatch(submitBatchQuestionResponses(batchPayload));

    if (submitBatchQuestionResponses.fulfilled.match(result)) {
      const surveyResponseId = unifiedState.surveyResponseId;
      const uuid = unifiedState.uuid;
      if (surveyResponseId && uuid) {
        try {
          await completeSurveySubmission({
            dispatch,
            surveyId,
            surveyResponseId,
            uuid,
            metadata: undefined,
            sKey: metadata.sKey,
            uKey: metadata.uKey,
          });
        } catch (error: any) {
          if (error?.code === 'DUPLICATE_SUBMISSION') {
            console.warn('Duplicate completion detected; redirecting to complete page.');
          } else {
            const msg = error?.message || 'Failed to complete survey.';
            alert(msg);
          }
        }
      }
      navigate(`/survey/${surveyId}/complete`);
    } else {
      const errorMessage = (result as any)?.payload?.message || 'Failed to submit responses. Please try again.';
      console.error('Failed to submit batch responses:', result);
      alert(errorMessage);
    }
  };

  const handleQvModuleComplete = async (submissionResult?: SubmitQvQuestionResult) => {
    if (hasNonQVQuestions) {
      setActiveModule('nonQv');
      return;
    }

    const surveyId = metadata.surveyId || id || '';
    if (!surveyId) return;

    const surveyResponseId = submissionResult?.surveyResponseId || unifiedState.surveyResponseId;
    const uuid = submissionResult?.uuid || unifiedState.uuid;

    if (surveyResponseId && uuid) {
      try {
        await completeSurveySubmission({
          dispatch,
          surveyId,
          surveyResponseId,
          uuid,
          metadata: undefined,
          sKey: metadata.sKey,
          uKey: metadata.uKey,
        });
      } catch (error: any) {
        if (error?.code === 'DUPLICATE_SUBMISSION') {
          console.warn('Duplicate completion detected; redirecting to complete page.');
        } else {
          const msg = error?.message || 'Failed to complete survey.';
          alert(msg);
        }
      }
    } else {
      console.warn('Skipping completion because survey identifiers are missing.', {
        surveyResponseId,
        uuid,
      });
    }

    navigate(`/survey/${surveyId}/complete`);
  };

  return (
    <>
      {showResumeModal && resumeLink && (
        <ResumeModal link={resumeLink} onClose={() => setShowResumeModal(false)} />
      )}
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
      {hasQVQuestions && activeModule === 'qv' && (
        <QuadraticSurveyPage
          style={config.style}
          inputType={config.inputType}
          onCompleteLastQuestion={handleQvModuleComplete}
          hasNextModuleAfterQv={hasNonQVQuestions}
        />
      )}

      {/* Show non-QV questions if there are any */}
      {hasNonQVQuestions && activeModule === 'nonQv' && (
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
