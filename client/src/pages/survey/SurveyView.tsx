import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMetaData, setSKey, setUKey, setUuid, resetMetadata } from '../../features/metadataSlice';
import { fetchSampleQuestions, clearQuestionsState } from '../../features/questionsSlice';
import { ApprovalSurveyPage, QuadraticSurveyPage } from './components';
import ResumeModal from '../../components/ResumeModal/ResumeModal';
import MultiQuestionSurveyPage from './components/MultiQuestionSurveyPage';
import { fetchSurveyData } from '../../features/surveysSlice';
import './survey.css';
import { submitBatchQuestionResponses, fetchSurveyResponseByUUID } from '../../features/options/api/options.api';
import { buildNonQvBatchPayload } from '../../utils/submissionBuilder';
import { selectUnifiedSlice } from '../../features/unifiedResponsesSelectors';
import {
  resetUnifiedResponses,
  seedApprovalQuestion,
  seedQvQuestion,
  qvSetBinsConfig,
  startSurveySession,
} from '../../features/unifiedResponsesSlice';
import { completeSurveySubmission, SubmitApprovalQuestionResult, SubmitQvQuestionResult } from '../../components/QsNavBar/submission';
import { IQuestion } from '../../types/coreTypes';
import { IBackendQsOptions } from '../../types/backendTypes';
import { MdExitToApp } from 'react-icons/md';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

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
  const surveysState = useAppSelector(state => state.surveys);
  const previousSurveyIdRef = useRef<string | null>(null);
  
  // Set document title with survey title if available (memoized to prevent unnecessary updates)
  const documentTitle = useMemo(
    () => `${surveysState.surveyTitle || 'Survey'} – QSurvey System`,
    [surveysState.surveyTitle]
  );
  useDocumentTitle(documentTitle);
  
  // Preserve survey question order as provided by the backend (mixed types)
  const orderedQuestions = useMemo(() => {
    const surveyList: any[] =
      Array.isArray((questions as any)?.order) && (questions as any).order.length > 0
        ? (questions as any).order
        : [];
    const byId = questions.byId ?? {};
    // If the store exposes an order array, map it to question objects; otherwise fall back to byId values.
    const resolved = surveyList
      .map((id: any) => {
        const key = typeof id === 'string' ? id : id?.toString?.();
        return key && byId[key] ? byId[key] : null;
      })
      .filter(Boolean) as any[];
    if (resolved.length > 0) {
      return resolved;
    }
    // Fallback: preserve insertion order from byId values if no explicit order
    return Object.values(byId ?? {}).slice().sort((a: any, b: any) => {
      const aPos = typeof a?.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
      const bPos = typeof b?.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
      if (aPos !== bPos) return aPos - bPos;
      return resolveQuestionId(a).localeCompare(resolveQuestionId(b));
    });
  }, [questions]);
  
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

  // Reset state when switching surveys to avoid leaking previous responses/questions
  useEffect(() => {
    if (!id) return;
    if (previousSurveyIdRef.current && previousSurveyIdRef.current !== id) {
      dispatch(resetUnifiedResponses());
      dispatch(clearQuestionsState());
      dispatch(resetMetadata());
      setResumeHydrated(false);
      seededQuestionsRef.current.clear();
      seededApprovalQuestionsRef.current.clear();
    }
    previousSurveyIdRef.current = id;

    if (unifiedState.surveyId && unifiedState.surveyId !== id) {
      dispatch(resetUnifiedResponses());
    }
    if (!unifiedState.surveyId || unifiedState.surveyId !== id) {
      dispatch(startSurveySession({ surveyId: id, surveyResponseId: null, uuid: undefined }));
    }
  }, [dispatch, id]);

  // Load survey data
  useEffect(() => {
    if (id) {
      // Fetch all necessary survey data; if a different surveyId is active, refetch regardless of loaded flag
      if (!metadata.loaded || metadata.surveyId !== id) {
        dispatch(fetchMetaData(id));
      }
      if (!questions.loaded || (questions as any).loadedSurveyId !== id) {
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
  const segments = useMemo(() => {
    type SegmentType = 'qv' | 'approval' | 'nonQv';
    const result: { type: SegmentType; questionIds: string[] }[] = [];
    orderedQuestions.forEach((q) => {
      const qType: SegmentType =
        (q?.type ?? 'qv') === 'qv'
          ? 'qv'
          : (q?.type ?? '') === 'approval'
            ? 'approval'
            : 'nonQv';
      const qId = resolveQuestionId(q);
      if (!qId) return;
      const last = result[result.length - 1];
      if (last && last.type === qType) {
        last.questionIds.push(qId);
      } else {
        result.push({ type: qType, questionIds: [qId] });
      }
    });
    return result;
  }, [orderedQuestions]);

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [resumeHydrated, setResumeHydrated] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeLink, setResumeLink] = useState<string | null>(null);
  const seededQuestionsRef = useRef<Set<string>>(new Set());
  const seededApprovalQuestionsRef = useRef<Set<string>>(new Set());
  const activeSegment = segments[activeSegmentIndex];
  const hasNonQVQuestions = segments.some((segment) => segment.type === 'nonQv');
  const hasQVQuestions = segments.some((segment) => segment.type === 'qv');
  const hasApprovalQuestions = segments.some((segment) => segment.type === 'approval');
  const nonQvQuestionIdsOrdered = useMemo(() => {
    return orderedQuestions
      .filter((q: any) => q.type === 'likert' || q.type === 'text')
      .map((q: any) => resolveQuestionId(q))
      .filter((id): id is string => Boolean(id));
  }, [orderedQuestions]);

  // Reset to the first segment whenever the segment list changes (new survey load)
  useEffect(() => {
    setActiveSegmentIndex(0);
  }, [segments.map((s) => `${s.type}:${s.questionIds.join('|')}`).join('#')]);

  // Seed unified QV state once questions are loaded
  useEffect(() => {
    if (!questions.loaded) {
      seededQuestionsRef.current.clear();
      return;
    }

    const questionItems: IQuestion[] = Object.values(questions.byId ?? {});
    const qvItems = questionItems.filter((q) => (q.type ?? 'qv') === 'qv');

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

  // Seed approval state once questions are loaded
  useEffect(() => {
    if (!questions.loaded) {
      seededApprovalQuestionsRef.current.clear();
      return;
    }

    const questionItems: IQuestion[] = Object.values(questions.byId ?? {});
    const approvalItems = questionItems.filter((q) => (q.type ?? '') === 'approval');

    approvalItems.forEach((question) => {
      const questionId = resolveQuestionId(question);
      if (!questionId || seededApprovalQuestionsRef.current.has(questionId)) {
        return;
      }

      const rawOptions = Array.isArray((question as any).rawOptions) ? (question as any).rawOptions : [];
      const optionsPayload = (rawOptions as IBackendQsOptions[])
        .filter((option) => typeof option?.optionId === 'string' && option.optionId.length > 0)
        .map((option) => ({
          optionId: option.optionId,
          optionName: option.optionName,
          description: option.description || '',
        }));

      if (optionsPayload.length === 0) {
        return;
      }

      dispatch(
        seedApprovalQuestion({
          questionId,
          options: optionsPayload,
          order: optionsPayload.map((opt) => opt.optionId),
        }),
      );

      seededApprovalQuestionsRef.current.add(questionId);
    });
  }, [questions.loaded, questions.byId, dispatch]);

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
      <div className="loading-container">
        <div className="survey-exit-bar">
          <button
            type="button"
            className="survey-exit-button"
            onClick={() => navigate('/')}
          >
            <MdExitToApp className="survey-exit-button-icon" />
            <span>Exit survey</span>
          </button>
        </div>
        <div className="loading-content">
          <div>Loading survey...</div>
        </div>
      </div>
    );
  }
  
  const advanceToNextSegment = () => {
    const nextIndex = activeSegmentIndex + 1;
    if (nextIndex < segments.length) {
      setActiveSegmentIndex(nextIndex);
      return true;
    }
    return false;
  };

  const handleNonQVSubmit = async (questionIdsOverride?: string[]) => {
    const surveyId = metadata.surveyId || id || '';

    if (!surveyId) {
      console.error('Survey ID missing when attempting to submit responses');
      alert('Unable to submit responses because the survey is not loaded correctly.');
      return;
    }

    const nonQvQuestionIds =
      questionIdsOverride && questionIdsOverride.length > 0
        ? questionIdsOverride
        : nonQvQuestionIdsOrdered;

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

    const submissionThunk = submitBatchQuestionResponses(batchPayload) as any;
    const result = submissionThunk
      ? await dispatch(submissionThunk)
      : { type: submitBatchQuestionResponses.fulfilled.type, payload: batchPayload };

    if (submitBatchQuestionResponses.fulfilled.match(result)) {
      if (advanceToNextSegment()) {
        return;
      }
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
    const surveyId = metadata.surveyId || id || '';
    if (!surveyId) return;

    const surveyResponseId = submissionResult?.surveyResponseId || unifiedState.surveyResponseId;
    const uuid = submissionResult?.uuid || unifiedState.uuid;

    if (advanceToNextSegment()) {
      return;
    }

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

  const handleApprovalModuleComplete = async (submissionResult?: SubmitApprovalQuestionResult) => {
    const surveyId = metadata.surveyId || id || '';
    if (!surveyId) return;

    const surveyResponseId = submissionResult?.surveyResponseId || unifiedState.surveyResponseId;
    const uuid = submissionResult?.uuid || unifiedState.uuid;

    if (advanceToNextSegment()) {
      return;
    }

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
      <div className="survey-container">
      <div className="survey-exit-bar">
        <button
          type="button"
          className="survey-exit-button"
          onClick={() => navigate('/')}
        >
          <MdExitToApp className="survey-exit-button-icon" />
          <span>Exit survey</span>
        </button>
      </div>

      {/* Render the currently active segment */}
      {activeSegment?.type === 'qv' && (
        <QuadraticSurveyPage
          style={config.style}
          inputType={config.inputType}
          onCompleteLastQuestion={handleQvModuleComplete}
          hasNextModuleAfterQv={Boolean(segments.slice(activeSegmentIndex + 1).length)}
          questionIds={activeSegment.questionIds}
        />
      )}

      {activeSegment?.type === 'approval' && (
        <ApprovalSurveyPage
          onCompleteLastQuestion={handleApprovalModuleComplete}
          hasNextModuleAfterApproval={Boolean(segments.slice(activeSegmentIndex + 1).length)}
          questionIds={activeSegment.questionIds}
        />
      )}

      {activeSegment?.type === 'nonQv' && (
        <MultiQuestionSurveyPage
          onSubmit={() => handleNonQVSubmit(activeSegment.questionIds)}
          questionIds={activeSegment.questionIds}
        />
      )}
      
      {/* Show an error if there are no questions */}
      {!hasQVQuestions && !hasNonQVQuestions && !hasApprovalQuestions && questions.loaded && (
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
