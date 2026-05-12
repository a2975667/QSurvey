import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdBarChart, MdBubbleChart, MdTableChart } from 'react-icons/md';
import { API_PREFIX } from '../../../config';
import { useAppSelector } from '../../../app/hooks';
import ResultsVisualizationPanel from '../../../components/results/ResultsVisualizationPanel';
import OptionTotalsBarChart from '../../../components/results/OptionTotalsBarChart';
import ApprovalStickerStackChart from '../../../components/results/ApprovalStickerStackChart';
import {
  buildOptionSeries,
  HighlightMap,
  orderOptionIds,
  orderTotalsBySumWithOriginalTie,
  type ResultsOrderBy,
} from '../../../components/results/utils';
import { ResultsMeta, RawVoteRow } from '../../../types/results';
import { SubmitterSnapshot } from '../../../types/submitterResults';
import { IBackendQuestion } from '../../../types/backendTypes';
import { IQuestion } from '../../../types/coreTypes';
import {
  isParticipantResultsSupportedQuestionType,
  normalizeQuestionType,
} from '../../../utils/questionType';
import '../../designer/surveyResults.css';

const PAGE_LIMIT = 50;
const MAX_SNAPSHOT_RETRIES = 3;
const SNAPSHOT_RETRY_DELAY_MS = 2000;
const PARTICIPANT_RESULTS_EMPTY_MESSAGE =
  'None of the questions have results enabled for survey respondents. If you think this is an error, please contact the survey administrator.';

interface SubmittedResultsSectionProps {
  surveyId: string;
  uuid?: string;
  sKey?: string;
  uKey?: string;
  questionResponseIds?: Record<string, string>;
}

interface ParticipantResultsQuestionOption {
  id: string;
  label: string;
  type: string;
  respondentResultsEnabled?: boolean;
  position?: number;
}

const normalizeParticipantResultsType = (rawType: unknown) => {
  if (typeof rawType !== 'string') return 'unknown';
  return normalizeQuestionType(rawType) || 'unknown';
};

const fromReduxQuestion = (
  question: IQuestion | undefined,
  fallbackId: string,
  fallbackPosition: number,
): ParticipantResultsQuestionOption | undefined => {
  if (!question) return undefined;
  const id = String(question.questionId || fallbackId);
  return {
    id,
    label: question.question || id,
    type: normalizeParticipantResultsType(question.type),
    respondentResultsEnabled: question.respondentResultsEnabled,
    position:
      typeof question.position === 'number' ? question.position : fallbackPosition,
  };
};

const fromBackendQuestion = (
  question: IBackendQuestion,
  fallbackPosition: number,
): ParticipantResultsQuestionOption | undefined => {
  if (!question?._id) return undefined;
  const rawType =
    question.type ||
    (question.setting && (question.setting as any).questionType) ||
    'unknown';
  return {
    id: question._id,
    label: question.question || question._id,
    type: normalizeParticipantResultsType(rawType),
    respondentResultsEnabled: question.respondentResultsEnabled,
    position:
      typeof question.position === 'number' ? question.position : fallbackPosition,
  };
};

const SubmittedResultsSection: React.FC<SubmittedResultsSectionProps> = ({
  surveyId,
  uuid,
  sKey,
  uKey,
}) => {
  const questions = useAppSelector((state) => state.questions.byId);
  const questionOrder = useAppSelector((state) => state.questions.order);
  const questionsLoadedSurveyId = useAppSelector((state) => state.questions.loadedSurveyId);
  const debugDefault =
    process.env.REACT_APP_RESULTS_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production';
  const debugLog = (...args: any[]) => {
    if (debugDefault) {
      // eslint-disable-next-line no-console
      console.log('[SubmittedResults][debug]', ...args);
    }
  };

  const [snapshot, setSnapshot] = useState<SubmitterSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const inFlightRef = useRef(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [fallbackQuestions, setFallbackQuestions] = useState<ParticipantResultsQuestionOption[]>([]);
  const [fallbackQuestionsKey, setFallbackQuestionsKey] = useState<string | null>(null);
  const [fallbackQuestionsLoading, setFallbackQuestionsLoading] = useState(false);
  const [fallbackQuestionsError, setFallbackQuestionsError] = useState<string | null>(null);
  const attemptedQuestionCatalogKeyRef = useRef<string | null>(null);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>();

  const [resultsMeta, setResultsMeta] = useState<ResultsMeta | null>(null);
  const [rawRows, setRawRows] = useState<RawVoteRow[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [totalsView, setTotalsView] = useState<'dots' | 'chart' | 'table'>('chart');
  const [orderBy, setOrderBy] = useState<ResultsOrderBy>('variance');

  const reduxQuestionOptions = useMemo(() => {
    const orderedIds =
      questionOrder.length > 0
        ? questionOrder
        : Object.values(questions ?? {})
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((question) => String(question.questionId));

    return orderedIds
      .map((id, index) => fromReduxQuestion(questions?.[id], id, index))
      .filter(Boolean) as ParticipantResultsQuestionOption[];
  }, [questionOrder, questions]);

  const hasReduxQuestionCatalog =
    questionsLoadedSurveyId === surveyId && reduxQuestionOptions.length > 0;

  const fallbackQuestionCatalogKey = useMemo(() => {
    if (!surveyId) return null;
    return [surveyId, sKey ?? '', uKey ?? ''].join('|');
  }, [surveyId, sKey, uKey]);

  useEffect(() => {
    if (hasReduxQuestionCatalog) return;
    if (!fallbackQuestionCatalogKey || !surveyId) return;
    if (attemptedQuestionCatalogKeyRef.current === fallbackQuestionCatalogKey) return;

    let isActive = true;

    const run = async () => {
      try {
        attemptedQuestionCatalogKeyRef.current = fallbackQuestionCatalogKey;
        setFallbackQuestionsLoading(true);
        setFallbackQuestionsError(null);
        setFallbackQuestions([]);
        setFallbackQuestionsKey(null);

        const params = new URLSearchParams();
        if (sKey) params.set('sKey', sKey);
        if (uKey) params.set('uKey', uKey);
        const query = params.toString();
        const response = await fetch(
          `${API_PREFIX}/surveys/${surveyId}${query ? `?${query}` : ''}`,
        );
        if (!response.ok) {
          throw new Error(`Question catalog request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!isActive) return;

        const options = Array.isArray(data?.questions)
          ? data.questions
              .map((question: IBackendQuestion, index: number) =>
                fromBackendQuestion(question, index),
              )
              .filter(Boolean)
          : [];
        setFallbackQuestions(options as ParticipantResultsQuestionOption[]);
        setFallbackQuestionsKey(fallbackQuestionCatalogKey);
      } catch (error: any) {
        if (!isActive) return;
        setFallbackQuestionsError(error?.message || 'Failed to load survey questions.');
        setFallbackQuestions([]);
        setFallbackQuestionsKey(fallbackQuestionCatalogKey);
      } finally {
        if (isActive) {
          setFallbackQuestionsLoading(false);
        }
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [fallbackQuestionCatalogKey, hasReduxQuestionCatalog, surveyId, sKey, uKey]);

  useEffect(() => {
    if (!hasReduxQuestionCatalog) return;
    setFallbackQuestions([]);
    setFallbackQuestionsKey(null);
    setFallbackQuestionsError(null);
  }, [hasReduxQuestionCatalog]);

  const questionOptions = useMemo(() => {
    const catalog =
      hasReduxQuestionCatalog ||
      (fallbackQuestionsKey === fallbackQuestionCatalogKey && fallbackQuestions.length > 0)
        ? hasReduxQuestionCatalog
          ? reduxQuestionOptions
          : fallbackQuestions
        : [];
    return catalog
      .filter((question) => question.respondentResultsEnabled !== false)
      .filter((question) => isParticipantResultsSupportedQuestionType(question.type));
  }, [
    fallbackQuestionCatalogKey,
    fallbackQuestions,
    fallbackQuestionsKey,
    hasReduxQuestionCatalog,
    reduxQuestionOptions,
  ]);

  const supportedQuestionOptions = questionOptions;

  useEffect(() => {
    const firstSupportedQuestionId = supportedQuestionOptions[0]?.id;
    const selectedStillAvailable = supportedQuestionOptions.some(
      (question) => question.id === selectedQuestionId,
    );

    if (!firstSupportedQuestionId) {
      if (selectedQuestionId) {
        setSelectedQuestionId(undefined);
      }
      return;
    }

    if (!selectedQuestionId || !selectedStillAvailable) {
      setSelectedQuestionId(firstSupportedQuestionId);
    }
  }, [selectedQuestionId, supportedQuestionOptions]);

  useEffect(() => {
    debugLog('selectedQuestionId', selectedQuestionId);
  }, [selectedQuestionId]);

  const selectedQuestion = selectedQuestionId
    ? questionOptions.find((q) => q.id === selectedQuestionId)
    : undefined;
  const normalizedSelectedType = normalizeQuestionType(
    resultsMeta?.questionType || selectedQuestion?.type || '',
  );
  const isQvQuestion =
    normalizedSelectedType.startsWith('qv') ||
    normalizedSelectedType.startsWith('qs') ||
    normalizedSelectedType === 'quadratic';
  const isLikertQuestion = normalizedSelectedType === 'likert';
  const isSelectionQuestion = normalizedSelectedType === 'selection';
  const isApprovalQuestion = normalizedSelectedType === 'approval';
  const isSupportedQuestion = isQvQuestion || isLikertQuestion || isSelectionQuestion || isApprovalQuestion;
  const selectionResponseCount = resultsMeta?.counts?.responses ?? 0;
  const formatSelectionPercent = (count: number) => {
    if (!selectionResponseCount || selectionResponseCount <= 0) return null;
    const percent = Math.round((count / selectionResponseCount) * 100);
    if (!Number.isFinite(percent)) return null;
    return `${percent}%`;
  };

  useEffect(() => {
    if (!selectedQuestionId) return;
    setTotalsView(isApprovalQuestion ? 'dots' : 'chart');
  }, [isApprovalQuestion, selectedQuestionId]);

  const fetchKey = useMemo(() => {
    if (!uuid || !surveyId) return null;
    return [surveyId, uuid, sKey ?? '', uKey ?? ''].join('|');
  }, [surveyId, uuid, sKey, uKey]);

  const attemptedSnapshotKeyRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!fetchKey) return;
    if (!uuid || !surveyId) return;
    if (inFlightRef.current || snapshot) return;

    // Avoid hammering the endpoint when an error occurs; wait for manual retry or state change.
    if (attemptedSnapshotKeyRef.current === fetchKey && snapshotError) {
      return;
    }

    let isActive = true;

    const run = async () => {
      try {
        inFlightRef.current = true;
        attemptedSnapshotKeyRef.current = fetchKey;
        setSnapshotLoading(true);

        const params = new URLSearchParams();
        params.set('surveyId', surveyId);
        if (sKey) params.set('sKey', sKey);
        if (uKey) params.set('uKey', uKey);

        const response = await fetch(
          `${API_PREFIX}/survey/responses/${uuid}?${params.toString()}`,
        );

        if (!response.ok) {
          const status = response.status;
          const bodyText = await response.text().catch(() => '');
          const error: any = new Error(
            `Snapshot request failed with status ${status}${bodyText ? `: ${bodyText}` : ''}`,
          );
          error.status = status;
          error.body = bodyText;
          throw error;
        }

        const data: SubmitterSnapshot = await response.json();
        if (!isActive) return;

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        retryCountRef.current = 0;
        setSnapshot(data);
      } catch (error: any) {
        if (!isActive) return;
        const message = error?.message || 'Failed to load results snapshot.';
        setSnapshotError(message);

        // Only retry on transient errors (5xx/429) or network failures (no status)
        const status = error?.status as number | undefined;
        const isTransient = typeof status === 'number' ? (status >= 500 || status === 429) : !status;
        if (isTransient && retryCountRef.current < MAX_SNAPSHOT_RETRIES) {
          retryCountRef.current += 1;
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          const delay = SNAPSHOT_RETRY_DELAY_MS * retryCountRef.current;
          retryTimeoutRef.current = setTimeout(() => {
            attemptedSnapshotKeyRef.current = null;
            setSnapshotError(null);
            setSnapshot(null);
          }, delay);
        }
      } finally {
        if (isActive) {
          inFlightRef.current = false;
          setSnapshotLoading(false);
        }
      }
    };

    run();

    return () => {
      isActive = false;
      inFlightRef.current = false;
    };
  }, [fetchKey, snapshot, snapshotError, surveyId, uuid, sKey, uKey]);

  const fetchAllAggregatedResults = useCallback(async () => {
    if (!snapshot || !selectedQuestionId || !isSupportedQuestion || !surveyId) return;
    setLoadingResults(true);
    setResultsError(null);
    try {
      let cursor: string | undefined = undefined;
      let acc: RawVoteRow[] = [];
      let lastMeta: ResultsMeta | null = null;
      while (true) {
        const params = new URLSearchParams();
        params.set('surveyId', surveyId);
        params.set('questionId', selectedQuestionId);
        params.set('limit', PAGE_LIMIT.toString());
        params.set('ts', Date.now().toString());
        if (cursor) params.set('cursor', cursor);
        if (sKey) params.set('sKey', sKey);
        if (uKey) params.set('uKey', uKey);
        const response = await fetch(
          `${API_PREFIX}/survey/responses/${snapshot.uuid}/results?${params.toString()}`,
          { cache: 'no-store' },
        );
        if (!response.ok) throw new Error(`Aggregated results request failed with status ${response.status}`);
        const payload: { meta: ResultsMeta; raw: RawVoteRow[]; nextCursor?: string | null } =
          await response.json();
        lastMeta = payload.meta;
        acc = acc.concat(payload.raw || []);
        const next = payload.nextCursor ?? null;
        if (!next) break;
        cursor = next;
      }
      if (lastMeta) setResultsMeta(lastMeta);
      // Defensive: restrict stored raw rows to the selected question's options
      const allowed = new Set((lastMeta?.optionTotals ?? []).map((o) => o.optionId));
      const filteredAcc = acc.filter((row) => row.optionId && allowed.has(row.optionId));
      setRawRows(filteredAcc);
    } catch (error: any) {
      setResultsError(error?.message || 'Failed to load aggregated results.');
    } finally {
      setLoadingResults(false);
    }
  }, [snapshot, selectedQuestionId, isSupportedQuestion, surveyId, sKey, uKey]);

  useEffect(() => {
    if (!snapshot) return;
    if (!selectedQuestionId) return;
    if (!isSupportedQuestion) {
      debugLog('unsupported-question-type', {
        selectedQuestionId,
        normalizedSelectedType,
      });
      setResultsMeta(null);
      setRawRows([]);
      return;
    }
    setResultsMeta(null);
    setRawRows([]);
    fetchAllAggregatedResults();
  }, [snapshot, selectedQuestionId, isSupportedQuestion, fetchAllAggregatedResults, supportedQuestionOptions]);

  const submitterQuestionResponse = useMemo(() => {
    if (!snapshot || !selectedQuestionId) return undefined;
    return snapshot.questionResponses.find(
      (response) => response.questionId === selectedQuestionId,
    );
  }, [snapshot, selectedQuestionId]);

  const submitterVotes: HighlightMap = useMemo(() => {
    if (!submitterQuestionResponse) return {};
    const votes = submitterQuestionResponse.responseContent?.votes;
    if (!Array.isArray(votes)) return {};
    const respondentId = snapshot?.respondentId || snapshot?.uuid;
    const map: HighlightMap = {};
    votes.forEach((entry: any) => {
      const optionId = entry?.optionId || entry?.optionID || entry?.id;
      if (!optionId) return;
      const valueRaw = entry?.votes ?? entry?.value ?? entry?.score ?? 0;
      const value = Number(valueRaw);
      if (!Number.isFinite(value)) return;
      map[optionId] = { respondentId, value };
    });
    return map;
  }, [submitterQuestionResponse, snapshot]);

  const submitterQvContributionMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(submitterVotes).forEach(([optionId, entry]) => {
      const value = entry?.value;
      if (typeof value === 'number' && Number.isFinite(value)) {
        map[optionId] = value;
      }
    });
    return map;
  }, [submitterVotes]);

  const submitterApprovalContributionMap = useMemo(() => {
    if (!isApprovalQuestion) return {};
    const map: Record<string, number> = {};
    const approvals = submitterQuestionResponse?.responseContent?.approvals;
    if (!Array.isArray(approvals)) return map;
    approvals.forEach((optionId: any) => {
      if (typeof optionId === 'string' && optionId.length > 0) {
        map[optionId] = 1;
      }
    });
    return map;
  }, [isApprovalQuestion, submitterQuestionResponse]);

  const submitterContributionMap = useMemo(
    () => (isApprovalQuestion ? submitterApprovalContributionMap : submitterQvContributionMap),
    [isApprovalQuestion, submitterApprovalContributionMap, submitterQvContributionMap],
  );

  // Compute allowed option IDs (array) early; sets are created within memos to avoid TDZ pitfalls
  const submitterAllowedIds = useMemo(() => {
    if (!selectedQuestionId) return undefined;
    const options = (questions?.[selectedQuestionId] as any)?.options;
    if (!Array.isArray(options) || options.length === 0) return undefined;
    const ids = options
      .map((opt: any) => (typeof opt === 'string' ? opt : opt?.optionId))
      .filter((id: any) => typeof id === 'string' && id.length > 0);
    return ids.length ? ids : undefined;
  }, [questions, selectedQuestionId]);

  const submitterOptionNames = useMemo(() => {
    const names = new Map<string, string>();
    if (!selectedQuestionId) return names;
    const options = (questions?.[selectedQuestionId] as any)?.options;
    if (!Array.isArray(options) || options.length === 0) return names;
    options.forEach((option: any) => {
      if (typeof option === 'string') {
        names.set(option, option);
        return;
      }
      const optionId = option?.optionId;
      if (typeof optionId !== 'string' || optionId.length === 0) return;
      const optionName =
        typeof option?.optionName === 'string' && option.optionName.length > 0
          ? option.optionName
          : optionId;
      names.set(optionId, optionName);
    });
    return names;
  }, [questions, selectedQuestionId]);

  const optionSeries = useMemo(() => {
    if (!isQvQuestion) return [];
    const allowedSet = submitterAllowedIds ? new Set(submitterAllowedIds) : undefined;
    const totals = (resultsMeta?.optionTotals ?? []).filter(
      (t) => !allowedSet || allowedSet.has(t.optionId),
    );
    return buildOptionSeries(totals, rawRows);
  }, [isQvQuestion, resultsMeta, rawRows, submitterAllowedIds]);

  const builderTotals = useMemo(() => {
    const totals = resultsMeta?.optionTotals ?? [];
    if (!submitterAllowedIds) return totals;
    const allowedSet = new Set(submitterAllowedIds);
    const filteredTotals = totals.filter((t) => allowedSet.has(t.optionId));
    if (!isApprovalQuestion) return filteredTotals;
    if ((resultsMeta?.counts?.responses ?? 0) <= 0) return filteredTotals;

    const byId = new Map(filteredTotals.map((total) => [total.optionId, total]));
    return submitterAllowedIds.map((optionId) => {
      const existing = byId.get(optionId);
      if (existing) return existing;
      return {
        optionId,
        optionName: submitterOptionNames.get(optionId) ?? optionId,
        sum: 0,
      };
    });
  }, [resultsMeta, submitterAllowedIds, isApprovalQuestion, submitterOptionNames]);

  const orderedOptionTotals = useMemo(() => {
    if (!isQvQuestion) {
      return {
        orderedOptionIds: optionSeries.map((s) => s.optionId),
        statsByOptionId: {},
      };
    }
    return orderOptionIds(optionSeries, builderTotals, orderBy, resultsMeta?.counts?.responses);
  }, [builderTotals, isQvQuestion, optionSeries, orderBy, resultsMeta]);

  const orderedOptionSeries = useMemo(() => {
    const byId = new Map(optionSeries.map((series) => [series.optionId, series]));
    return orderedOptionTotals.orderedOptionIds
      .map((optionId) => byId.get(optionId))
      .filter(Boolean) as typeof optionSeries;
  }, [optionSeries, orderedOptionTotals.orderedOptionIds]);

  const orderedBuilderTotals = useMemo(() => {
    const byId = new Map(builderTotals.map((entry) => [entry.optionId, entry]));
    return orderedOptionTotals.orderedOptionIds
      .map((optionId) => byId.get(optionId))
      .filter(Boolean) as typeof builderTotals;
  }, [builderTotals, orderedOptionTotals.orderedOptionIds]);

  const approvalOrderedTotals = useMemo(() => {
    if (!isApprovalQuestion) return builderTotals;
    return orderTotalsBySumWithOriginalTie(builderTotals, submitterAllowedIds);
  }, [builderTotals, isApprovalQuestion, submitterAllowedIds]);

  const handleRetrySnapshot = () => {
    setSnapshotError(null);
    setSnapshot(null);
    setResultsMeta(null);
    setRawRows([]);
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    attemptedSnapshotKeyRef.current = null;
  };

  // Attempt to get totalCredits for selected question (if available)
  const totalCredits = useMemo(() => {
    if (!selectedQuestionId) return undefined;
    const q = questions?.[selectedQuestionId] as any;
    const credits = q?.totalCredits ?? q?.setting?.totalCredits;
    return typeof credits === 'number' ? credits : undefined;
  }, [questions, selectedQuestionId]);

  if (!uuid) {
    return (
      <div className="results-card error-card">
        <p>Submission snapshot is unavailable (missing UUID).</p>
      </div>
    );
  }

  if (snapshotLoading && !snapshot) {
    return (
      <div className="results-card">
        <p className="status-text">Loading submission results...</p>
      </div>
    );
  }

  if (snapshotError) {
    return (
      <div className="results-card error-card">
        <p>{snapshotError}</p>
        <button className="secondary-btn" onClick={handleRetrySnapshot}>
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const submittedAt = snapshot.submittedAt
    ? new Date(snapshot.submittedAt).toLocaleString()
    : '—';
  const respondentId = snapshot.respondentId || snapshot.uuid;
  const questionCatalogPending =
    !hasReduxQuestionCatalog &&
    !!fallbackQuestionCatalogKey &&
    attemptedQuestionCatalogKeyRef.current !== fallbackQuestionCatalogKey &&
    fallbackQuestions.length === 0 &&
    !fallbackQuestionsError;
  const showQuestionCatalogLoading =
    questionCatalogPending ||
    (!hasReduxQuestionCatalog && fallbackQuestionsLoading && fallbackQuestions.length === 0);

  // allowedSubmitterSet and builderTotals defined above

  return (
    <section className="submitted-results">
      <div className="submitted-results-header">
        <div>
          <p className="panel-overline">Submission</p>
          <p className="panel-subtitle">
            Respondent ID: <span className="code-text">{respondentId}</span> · Submitted at: {submittedAt}
          </p>
        </div>
        {questionOptions.length > 0 && (
          <div className="header-actions">
            <label htmlFor="submitted-question">Question</label>
            <select
              id="submitted-question"
              className="secondary-btn"
              value={selectedQuestionId || ''}
              onChange={(event) => setSelectedQuestionId(event.target.value)}
            >
              {questionOptions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.label}
                </option>
              ))}
            </select>
            <button
              className="secondary-btn"
              onClick={() => fetchAllAggregatedResults()}
              disabled={loadingResults || !isSupportedQuestion}
            >
              Refresh Results
            </button>
          </div>
        )}
      </div>

      {showQuestionCatalogLoading ? (
        <p className="status-text">Loading available results...</p>
      ) : fallbackQuestionsError && !hasReduxQuestionCatalog ? (
        <div className="results-card error-card" style={{ marginTop: '1rem' }}>
          <p>{fallbackQuestionsError}</p>
        </div>
      ) : questionOptions.length === 0 ? (
        <p className="status-text">{PARTICIPANT_RESULTS_EMPTY_MESSAGE}</p>
      ) : !selectedQuestionId ? (
        <p className="status-text">{PARTICIPANT_RESULTS_EMPTY_MESSAGE}</p>
      ) : !isSupportedQuestion ? (
        <p className="status-text">
          Visualization for this question type is not supported yet. Only
          Quadratic Survey, Likert, Selection, and Approval questions are currently available.
        </p>
      ) : (
        <>
          {resultsError && (
            <div className="results-card error-card" style={{ marginTop: '1rem' }}>
              <p>{resultsError}</p>
            </div>
          )}

          {loadingResults && !rawRows.length ? (
            <p className="status-text">Loading aggregated results...</p>
          ) : (
            <>
              {isQvQuestion && (
                <>
                  <ResultsVisualizationPanel
                    optionSeries={orderedOptionSeries}
                    highlightValues={submitterVotes}
                    meta={resultsMeta ?? undefined}
                    totalCredits={totalCredits}
                    onFilteredIdsChange={setFilteredIds}
                    orderBy={orderBy}
                    onOrderByChange={setOrderBy}
                    statsByOptionId={orderedOptionTotals.statsByOptionId}
                  />

                  <div className="results-card">
                    <div className="results-card-header">
                      <div>
                        <p className="panel-overline">Results: Group Sums and your influence</p>
                        {/* <p className="panel-subtitle">Group sums and your contribution</p> */}
                      </div>
                      <div className="results-header-controls">
                        <div className="view-toggle" role="group" aria-label="Option totals view">
                          <button
                            type="button"
                            className={`toggle-btn ${totalsView === 'chart' ? 'active' : ''}`}
                            aria-pressed={totalsView === 'chart'}
                            onClick={() => setTotalsView('chart')}
                            aria-label="Show chart view"
                          >
                            <MdBarChart aria-hidden="true" />
                            <span>Chart</span>
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${totalsView === 'table' ? 'active' : ''}`}
                            aria-pressed={totalsView === 'table'}
                            onClick={() => setTotalsView('table')}
                            aria-label="Show table view"
                          >
                            <MdTableChart aria-hidden="true" />
                            <span>Table</span>
                          </button>
                        </div>
                        <div className="results-order-by">
                          <label htmlFor="submitted-results-order-by-select">Order by</label>
                          <select
                            id="submitted-results-order-by-select"
                            value={orderBy}
                            onChange={(event) => setOrderBy(event.target.value as ResultsOrderBy)}
                            aria-label="Order results by"
                          >
                            <option value="default">Total</option>
                            <option value="variance">Variance</option>
                            <option value="range">Range</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    {builderTotals.length === 0 ? (
                      <p className="status-text">No group responses yet.</p>
                    ) : (
                      <>
                        {totalsView === 'chart' ? (
                          <OptionTotalsBarChart
                            totals={orderedBuilderTotals.map((total) => ({
                              optionId: total.optionId,
                              label: total.optionName || total.optionId,
                              sum: total.sum,
                            }))}
                            optionSeries={orderedOptionSeries}
                            filteredIds={filteredIds}
                            selfContribution={submitterContributionMap}
                            preserveOrder
                          />
                        ) : (
                          <table className="results-table" aria-label="Option totals">
                            <thead>
                              <tr>
                                <th scope="col">Option</th>
                                <th scope="col">Total votes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderedBuilderTotals.map((total) => (
                                <tr key={total.optionId}>
                                  <td>{total.optionName || total.optionId}</td>
                                  <td>{total.sum.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {(isLikertQuestion || isSelectionQuestion || isApprovalQuestion) && (
                  <div className="results-card" style={{ marginTop: '1rem' }}>
                    <div className="results-card-header">
                    <div>
                      <p className="panel-overline">Results</p>
                      <p className="panel-subtitle">
                        {isSelectionQuestion || isApprovalQuestion
                          ? 'Option counts for this question'
                          : 'Group counts for this question'}
                      </p>
                    </div>
                    <div className="view-toggle" role="group" aria-label="Option totals view">
                      {isApprovalQuestion && (
                        <button
                          type="button"
                          className={`toggle-btn ${totalsView === 'dots' ? 'active' : ''}`}
                          aria-pressed={totalsView === 'dots'}
                          onClick={() => setTotalsView('dots')}
                          aria-label="Show dots view"
                        >
                          <MdBubbleChart aria-hidden="true" />
                          <span>Dots</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={`toggle-btn ${totalsView === 'chart' ? 'active' : ''}`}
                        aria-pressed={totalsView === 'chart'}
                        onClick={() => setTotalsView('chart')}
                        aria-label="Show chart view"
                      >
                        <MdBarChart aria-hidden="true" />
                        <span>Chart</span>
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${totalsView === 'table' ? 'active' : ''}`}
                        aria-pressed={totalsView === 'table'}
                        onClick={() => setTotalsView('table')}
                        aria-label="Show table view"
                      >
                        <MdTableChart aria-hidden="true" />
                        <span>Table</span>
                      </button>
                    </div>
                  </div>
                  {builderTotals.length === 0 ? (
                    <p className="status-text">No group responses yet.</p>
                  ) : totalsView === 'table' ? (
                    <table className="results-table" aria-label="Response totals">
                      <thead>
                        <tr>
                          <th scope="col">{isSelectionQuestion || isApprovalQuestion ? 'Option' : 'Selection'}</th>
                          <th scope="col">{isApprovalQuestion ? 'Total votes' : 'Responses'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isApprovalQuestion ? approvalOrderedTotals : builderTotals).map((total) => {
                          const percentText = isSelectionQuestion
                            ? formatSelectionPercent(total.sum)
                            : null;
                          return (
                            <tr key={total.optionId}>
                              <td>{total.optionName || total.optionId}</td>
                              <td>
                                {total.sum.toLocaleString()}
                                {percentText ? ` (${percentText})` : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : isApprovalQuestion && totalsView === 'dots' ? (
                    <ApprovalStickerStackChart
                      totals={approvalOrderedTotals.map((total) => ({
                        optionId: total.optionId,
                        label: total.optionName || total.optionId,
                        sum: total.sum,
                      }))}
                      rawRows={rawRows}
                      submitterRespondentId={respondentId}
                    />
                  ) : (
                    <OptionTotalsBarChart
                      totals={(isApprovalQuestion ? approvalOrderedTotals : builderTotals).map((total) => ({
                        optionId: total.optionId,
                        label: total.optionName || total.optionId,
                        sum: total.sum,
                      }))}
                      optionSeries={[]}
                      filteredIds={[]}
                      selfContribution={isApprovalQuestion ? submitterContributionMap : undefined}
                      preserveOrder={isApprovalQuestion}
                      axisMode={isApprovalQuestion ? 'nonNegative' : 'symmetric'}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};

export default SubmittedResultsSection;
