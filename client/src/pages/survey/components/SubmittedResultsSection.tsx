import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdBarChart, MdTableChart } from 'react-icons/md';
import { API_PREFIX } from '../../../config';
import { useAppSelector } from '../../../app/hooks';
import ResultsVisualizationPanel from '../../../components/results/ResultsVisualizationPanel';
import OptionTotalsBarChart from '../../../components/results/OptionTotalsBarChart';
import {
  buildOptionSeries,
  HighlightMap,
  orderOptionIds,
  type ResultsOrderBy,
} from '../../../components/results/utils';
import { ResultsMeta, RawVoteRow } from '../../../types/results';
import { SubmitterSnapshot } from '../../../types/submitterResults';
import { normalizeQuestionType } from '../../../utils/questionType';
import '../../designer/surveyResults.css';

const PAGE_LIMIT = 50;
const MAX_SNAPSHOT_RETRIES = 3;
const SNAPSHOT_RETRY_DELAY_MS = 2000;

interface SubmittedResultsSectionProps {
  surveyId: string;
  uuid?: string;
  sKey?: string;
  uKey?: string;
  questionResponseIds?: Record<string, string>;
}

const SubmittedResultsSection: React.FC<SubmittedResultsSectionProps> = ({
  surveyId,
  uuid,
  sKey,
  uKey,
  questionResponseIds,
}) => {
  const questions = useAppSelector((state) => state.questions.byId);
  const unifiedByQuestionId = useAppSelector((state) => state.unifiedResponses.byQuestionId);
  const debugDefault =
    process.env.REACT_APP_RESULTS_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production';
  const debugLog = (...args: any[]) => {
    if (debugDefault || showDebug) {
      // eslint-disable-next-line no-console
      console.log('[SubmittedResults][debug]', ...args);
    }
  };

  const [showDebug, setShowDebug] = useState(debugDefault);
  const [snapshot, setSnapshot] = useState<SubmitterSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const inFlightRef = useRef(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>();

  const [resultsMeta, setResultsMeta] = useState<ResultsMeta | null>(null);
  const [rawRows, setRawRows] = useState<RawVoteRow[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [totalsView, setTotalsView] = useState<'chart' | 'table'>('chart');
  const [orderBy, setOrderBy] = useState<ResultsOrderBy>('default');
  const latestAnsweredIdsRef = useRef<string[]>([]);
  const latestSelectedQuestionIdRef = useRef<string | undefined>();

  const answeredQuestionIds = useMemo(() => {
    const keys = Object.keys(questionResponseIds ?? {});
    if (keys.length > 0) {
      return keys;
    }
    if (snapshot) {
      return snapshot.questionResponses.map((r) => r.questionId);
    }
    return [];
  }, [questionResponseIds, snapshot]);

  useEffect(() => {
    latestAnsweredIdsRef.current = answeredQuestionIds;
    debugLog('answeredQuestionIds', answeredQuestionIds);
  }, [answeredQuestionIds]);

  const questionOptions = useMemo(() => {
    const options = answeredQuestionIds.map((id) => {
      const question = questions?.[id];
      const unifiedQuestion = unifiedByQuestionId?.[id];
      const snapshotResponse = snapshot?.questionResponses?.find((response) => response.questionId === id);

      const rawType = typeof question?.type === 'string' ? question.type : undefined;
      const unifiedType = typeof unifiedQuestion?.type === 'string' ? unifiedQuestion.type : undefined;

      const inferredFromResponse = (() => {
        if (!snapshotResponse) return undefined;
        const responseContent = snapshotResponse.responseContent;
        if (responseContent && typeof responseContent === 'object') {
          if (Array.isArray((responseContent as any).votes)) return 'qv';
          if (Array.isArray((responseContent as any).selectedOptionIds)) return 'selection';
          if (typeof (responseContent as any).value === 'string') return 'text';
          if (typeof (responseContent as any).type === 'string') return (responseContent as any).type;
        }
        return undefined;
      })();

      const resolvedType = rawType || unifiedType || inferredFromResponse;
      const normalizedType =
        typeof resolvedType === 'string'
          ? normalizeQuestionType(resolvedType) || 'unknown'
          : 'unknown';

      const label = question?.question || id;

      debugLog('questionOption', {
        id,
        label,
        rawType,
        unifiedType,
        inferredFromResponse,
        normalizedType,
        hasQuestion: !!question,
        hasSnapshotResponse: !!snapshotResponse,
      });

      return { id, label, type: normalizedType };
    });
    return options.filter((option) => option.type !== 'text_block');
  }, [answeredQuestionIds, questions, unifiedByQuestionId, snapshot]);

  const supportedQuestionOptions = useMemo(
    () =>
      questionOptions.filter(
        (q) => q.type === 'qv' || q.type === 'likert' || q.type === 'selection',
      ),
    [questionOptions],
  );

  useEffect(() => {
    if (selectedQuestionId) return;
    if (supportedQuestionOptions.length > 0) {
      setSelectedQuestionId(supportedQuestionOptions[0].id);
      return;
    }
    if (answeredQuestionIds.length > 0) {
      setSelectedQuestionId(answeredQuestionIds[0]);
    }
  }, [answeredQuestionIds, selectedQuestionId, supportedQuestionOptions]);

  useEffect(() => {
    latestSelectedQuestionIdRef.current = selectedQuestionId;
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
  const isSupportedQuestion = isQvQuestion || isLikertQuestion || isSelectionQuestion;
  const selectionResponseCount = resultsMeta?.counts?.responses ?? 0;
  const formatSelectionPercent = (count: number) => {
    if (!selectionResponseCount || selectionResponseCount <= 0) return null;
    const percent = Math.round((count / selectionResponseCount) * 100);
    if (!Number.isFinite(percent)) return null;
    return `${percent}%`;
  };

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

        if (!latestSelectedQuestionIdRef.current) {
          const answeredIdsSnapshot = latestAnsweredIdsRef.current;
          const firstId =
            answeredIdsSnapshot[0] || data.questionResponses?.[0]?.questionId;
          if (firstId) {
            setSelectedQuestionId(firstId);
          }
        }
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

  const submitterContributionMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(submitterVotes).forEach(([optionId, entry]) => {
      const value = entry?.value;
      if (typeof value === 'number' && Number.isFinite(value)) {
        map[optionId] = value;
      }
    });
    return map;
  }, [submitterVotes]);

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
    return totals.filter((t) => allowedSet.has(t.optionId));
  }, [resultsMeta, submitterAllowedIds]);

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

  // allowedSubmitterSet and builderTotals defined above

  return (
    <section className="submitted-results">
      <div className="submitted-results-header">
        <div>
          <p className="panel-overline">Submission</p>
          <h2 className="panel-title">Submitted Results</h2>
          <p className="panel-subtitle">
            Respondent ID: <span className="code-text">{respondentId}</span> · Submitted at: {submittedAt}
          </p>
        </div>
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
          <button
            className="secondary-btn"
            onClick={() => setShowDebug((prev) => !prev)}
          >
            {showDebug ? 'Hide Debug Tables' : 'Show Debug Tables'}
          </button>
        </div>
      </div>

      {!selectedQuestionId ? (
        <p className="status-text">No question responses recorded yet.</p>
      ) : !isSupportedQuestion ? (
        <p className="status-text">
          Visualization for this question type is not supported yet. Only
          Quadratic Survey, Likert, and Selection questions are currently available.
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
                  <div className="results-card">
                    <div className="results-card-header">
                      <div>
                        <p className="panel-overline">Results</p>
                        <p className="panel-subtitle">Group sums and your contribution</p>
                      </div>
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
                </>
              )}

              {(isLikertQuestion || isSelectionQuestion) && (
                  <div className="results-card" style={{ marginTop: '1rem' }}>
                    <div className="results-card-header">
                    <div>
                      <p className="panel-overline">Results</p>
                      <p className="panel-subtitle">
                        {isSelectionQuestion ? 'Option counts for this question' : 'Group counts for this question'}
                      </p>
                    </div>
                    <div className="view-toggle" role="group" aria-label="Selection totals view">
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
                  ) : totalsView === 'chart' ? (
                    <OptionTotalsBarChart
                      totals={builderTotals.map((total) => ({
                        optionId: total.optionId,
                        label: total.optionName || total.optionId,
                        sum: total.sum,
                      }))}
                      optionSeries={[]}
                      filteredIds={[]}
                    />
                  ) : (
                    <table className="results-table" aria-label="Selection totals">
                      <thead>
                        <tr>
                          <th scope="col">{isSelectionQuestion ? 'Option' : 'Selection'}</th>
                          <th scope="col">Responses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {builderTotals.map((total) => {
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
                  )}
                </div>
              )}

              {showDebug && isQvQuestion && (
                <div className="debug-grid">
                  <div className="results-card">
                    <h3>My Votes</h3>
                    {!submitterQuestionResponse ? (
                      <p className="status-text">No submission recorded.</p>
                    ) : (
                      <table className="results-table" aria-label="My votes">
                        <thead>
                          <tr>
                            <th scope="col">Option</th>
                            <th scope="col">Vote</th>
                            <th scope="col">Recorded at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(submitterVotes).map(([optionId, entry]) => {
                            const label =
                              builderTotals.find((opt) => opt.optionId === optionId)?.optionName ||
                              optionId;
                            const recordedAt = submitterQuestionResponse.createdTime
                              ? new Date(submitterQuestionResponse.createdTime).toLocaleString()
                              : '—';
                            const voteValue = entry?.value ?? 0;
                            return (
                              <tr key={optionId}>
                                <td>{label}</td>
                                <td>{voteValue}</td>
                                <td>{recordedAt}</td>
                              </tr>
                            );
                          })}
                          {Object.keys(submitterVotes).length === 0 && (
                            <tr>
                              <td colSpan={3}>No votes submitted for this question.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="results-card">
                    <h3>Group Summary</h3>
                    {builderTotals.length === 0 ? (
                      <p className="status-text">No group votes yet.</p>
                    ) : (
                      <table className="results-table" aria-label="Group aggregates">
                        <thead>
                          <tr>
                            <th scope="col">Option</th>
                            <th scope="col">Total votes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {builderTotals.map((total) => (
                            <tr key={total.optionId}>
                              <td>{total.optionName || total.optionId}</td>
                              <td>{total.sum.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
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
