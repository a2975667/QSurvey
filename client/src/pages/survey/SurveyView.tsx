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
import { debugLog } from '../../utils/debugLog';

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

const isTextBlockQuestion = (question?: IQuestion) =>
  (question?.type ?? '').toLowerCase().replace(/[-\s]+/g, '_') === 'text_block';

const isLikertQuestion = (question?: IQuestion) =>
  (question?.type ?? '').toLowerCase() === 'likert';

const isTextQuestion = (question?: IQuestion) =>
  (question?.type ?? '').toLowerCase() === 'text';

const isSelectionQuestion = (question?: IQuestion) =>
  (question?.type ?? '').toLowerCase() === 'selection';

const buildNonQvPages = (
  questionIds: string[],
  byId: Record<string, IQuestion>,
): string[][] => {
  const pages: string[][] = [];
  let current: string[] = [];

  questionIds.forEach((questionId) => {
    const question = byId?.[questionId];
    const startsNewPage = isTextBlockQuestion(question) && Boolean(question?.newPage);

    if (startsNewPage && current.length > 0) {
      pages.push(current);
      current = [];
    }

    current.push(questionId);
  });

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
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
  const lastQuestionsSurveyIdRef = useRef<string | null>(null);
  
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
      if (lastQuestionsSurveyIdRef.current !== id) {
        lastQuestionsSurveyIdRef.current = id;
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
  }, [dispatch, id, sKey, uKey, uuid, metadata.loaded, metadata.surveyId]);

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
    type Segment = { type: SegmentType; questionIds: string[]; showInstructions?: boolean };
    const result: Segment[] = [];
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
      if (qType === 'qv') {
        const currentShowInstructions = (q as any)?.setting?.showInstructions !== false;
        if (last && last.type === 'qv' && last.showInstructions === currentShowInstructions) {
          last.questionIds.push(qId);
        } else {
          result.push({
            type: 'qv',
            questionIds: [qId],
            showInstructions: currentShowInstructions,
          });
        }
        return;
      }
      if (last && last.type === qType) {
        last.questionIds.push(qId);
      } else {
        result.push({ type: qType, questionIds: [qId] });
      }
    });
    return result;
  }, [orderedQuestions]);

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [activeNonQvPageIndex, setActiveNonQvPageIndex] = useState(0);
  const [resumeHydrated, setResumeHydrated] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeLink, setResumeLink] = useState<string | null>(null);
  const seededQuestionsRef = useRef<Set<string>>(new Set());
  const seededApprovalQuestionsRef = useRef<Set<string>>(new Set());
  const activeSegment = segments[activeSegmentIndex];
  const hasNonQVQuestions = segments.some((segment) => segment.type === 'nonQv');
  const hasQVQuestions = segments.some((segment) => segment.type === 'qv');
  const hasApprovalQuestions = segments.some((segment) => segment.type === 'approval');
  const nonQvPages = useMemo(() => {
    if (activeSegment?.type !== 'nonQv') return [];
    return buildNonQvPages(activeSegment.questionIds, questions.byId ?? {});
  }, [activeSegment?.type, activeSegment?.questionIds, questions.byId]);
  const currentNonQvPageIds = nonQvPages[activeNonQvPageIndex] ?? [];
  const hasNextNonQvPage = activeNonQvPageIndex < nonQvPages.length - 1;
  const hasPreviousNonQvPage = activeNonQvPageIndex > 0;
  const hasNextSegment = activeSegmentIndex < segments.length - 1;
  const nonQvPrimaryActionLabel =
    hasNextNonQvPage || hasNextSegment ? 'Next' : 'Submit Responses';

  const qvModuleShowInstructions = useMemo(() => {
    if (activeSegment?.type !== 'qv') return true;
    if (typeof activeSegment?.showInstructions === 'boolean') {
      return activeSegment.showInstructions;
    }
    const firstQuestionId = activeSegment.questionIds[0];
    if (!firstQuestionId) return true;
    const firstQuestion = (questions.byId ?? {})[firstQuestionId] as any;
    const showInstructions = firstQuestion?.setting?.showInstructions;
    return showInstructions !== false;
  }, [
    activeSegment?.type,
    activeSegment?.questionIds,
    activeSegment?.showInstructions,
    questions.byId,
  ]);

  useEffect(() => {
    if (activeSegment?.type !== 'qv') return;
    const firstQuestionId = activeSegment.questionIds[0];
    const firstQuestion = firstQuestionId
      ? (questions.byId ?? {})[firstQuestionId]
      : undefined;
    debugLog('[DEBUG][SurveyView] QV module showInstructions', {
      activeSegmentIndex,
      firstQuestionId,
      showInstructions: (firstQuestion as any)?.setting?.showInstructions,
      moduleShowInstructions: qvModuleShowInstructions,
    });
  }, [
    activeSegment?.type,
    activeSegment?.questionIds,
    activeSegmentIndex,
    questions.byId,
    qvModuleShowInstructions,
  ]);
  const nonQvQuestionIdsOrdered = useMemo(() => {
    return orderedQuestions
      .filter(
        (q: IQuestion) =>
          isLikertQuestion(q) || isTextQuestion(q) || isSelectionQuestion(q),
      )
      .map((q: IQuestion) => resolveQuestionId(q))
      .filter((id): id is string => Boolean(id));
  }, [orderedQuestions]);

  // Reset to the first segment whenever the segment list changes (new survey load)
  useEffect(() => {
    setActiveSegmentIndex(0);
    setActiveNonQvPageIndex(0);
  }, [
    segments
      .map(
        (s) =>
          `${s.type}:${s.questionIds.join('|')}:${
            typeof (s as any).showInstructions === 'boolean'
              ? (s as any).showInstructions
              : 'unset'
          }`,
      )
      .join('#'),
  ]);

  useEffect(() => {
    if (activeSegment?.type !== 'nonQv') {
      setActiveNonQvPageIndex(0);
      return;
    }
    if (activeNonQvPageIndex >= nonQvPages.length && nonQvPages.length > 0) {
      setActiveNonQvPageIndex(Math.max(0, nonQvPages.length - 1));
    }
  }, [activeSegment?.type, activeNonQvPageIndex, nonQvPages.length]);

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

      const rawOptions = Array.isArray((question as any).rawOptions)
        ? (question as any).rawOptions
        : Array.isArray((question as any).options)
        ? (question as any).options
        : [];
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
          maxApprovals:
            typeof (question as any).maxApprovals === 'number' &&
            Number.isInteger((question as any).maxApprovals) &&
            (question as any).maxApprovals >= 1
              ? (question as any).maxApprovals
              : undefined,
          unlimitedApprovals: (question as any).unlimitedApprovals === true,
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

  useEffect(() => {
    setActiveNonQvPageIndex(0);
  }, [activeSegmentIndex]);

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

  const submitNonQvBatch = async (questionIdsOverride: string[]) => {
    const surveyId = metadata.surveyId || id || '';

    if (!surveyId) {
      console.error('Survey ID missing when attempting to submit responses');
      alert('Unable to submit responses because the survey is not loaded correctly.');
      return { success: false, surveyId: '' };
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
      return { success: false, surveyId };
    }

    if (formattedResponses.length === 0) {
      alert('No responses to submit.');
      return { success: false, surveyId };
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
      const payloadFromResult = (result as any)?.payload || {};
      const surveyResponseFromResult = payloadFromResult?.surveyResponse;
      const resultSurveyResponseId =
        typeof surveyResponseFromResult?._id === 'string'
          ? surveyResponseFromResult._id
          : surveyResponseFromResult?._id?.toString?.();
      const resultUuid =
        typeof surveyResponseFromResult?.uuid === 'string'
          ? surveyResponseFromResult.uuid
          : undefined;

      const surveyResponseId =
        resultSurveyResponseId ||
        unifiedState.surveyResponseId ||
        batchPayload.surveyResponseId;
      const uuid = resultUuid || unifiedState.uuid || batchPayload.uuid;
      return {
        success: true,
        surveyId,
        surveyResponseId,
        uuid,
      };
    } else {
      const errorMessage = (result as any)?.payload?.message || 'Failed to submit responses. Please try again.';
      console.error('Failed to submit batch responses', {
        resultType: (result as any)?.type,
        hasPayload: Boolean((result as any)?.payload),
      });
      alert(errorMessage);
      return { success: false, surveyId };
    }
  };

  const completeSurveyIfPossible = async (
    surveyId: string,
    surveyResponseId?: string,
    uuid?: string,
  ) => {
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
      console.warn('Skipping completion because survey identifiers are missing.');
    }
    navigate(`/survey/${surveyId}/complete`);
  };

  const handleNonQvPrimaryAction = async () => {
    if (activeSegment?.type !== 'nonQv') return;
    const surveyId = metadata.surveyId || id || '';
    if (!surveyId) {
      console.error('Survey ID missing when attempting to submit responses');
      alert('Unable to submit responses because the survey is not loaded correctly.');
      return;
    }

    const submitQuestionIds = currentNonQvPageIds.filter((questionId) => {
      const question = (questions.byId ?? {})[questionId] as IQuestion | undefined;
      return (
        isLikertQuestion(question) ||
        isTextQuestion(question) ||
        isSelectionQuestion(question)
      );
    });

    if (submitQuestionIds.length === 0) {
      if (hasNextNonQvPage) {
        setActiveNonQvPageIndex((prev) => prev + 1);
        return;
      }
      if (advanceToNextSegment()) {
        return;
      }
      await completeSurveyIfPossible(
        surveyId,
        unifiedState.surveyResponseId ?? undefined,
        unifiedState.uuid,
      );
      return;
    }

    const submission = await submitNonQvBatch(submitQuestionIds);
    if (!submission.success) {
      return;
    }
    if (hasNextNonQvPage) {
      setActiveNonQvPageIndex((prev) => prev + 1);
      return;
    }
    if (advanceToNextSegment()) {
      return;
    }
    await completeSurveyIfPossible(
      surveyId,
      submission.surveyResponseId ?? unifiedState.surveyResponseId ?? undefined,
      submission.uuid ?? unifiedState.uuid,
    );
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
      console.warn('Skipping completion because survey identifiers are missing.');
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
      console.warn('Skipping completion because survey identifiers are missing.');
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
          showInstructions={qvModuleShowInstructions}
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
          onSubmit={handleNonQvPrimaryAction}
          questionIds={currentNonQvPageIds}
          hasNextPage={hasNextNonQvPage || hasNextSegment}
          hasPreviousPage={hasPreviousNonQvPage}
          onPreviousPage={
            hasPreviousNonQvPage ? () => setActiveNonQvPageIndex((prev) => prev - 1) : undefined
          }
          primaryActionLabel={nonQvPrimaryActionLabel}
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
