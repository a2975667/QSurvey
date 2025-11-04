import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_PREFIX } from '../../../config';
import { useAppSelector } from '../../../app/hooks';
import ResultsVisualizationPanel from '../../../components/results/ResultsVisualizationPanel';
import OptionTotalsBarChart from '../../../components/results/OptionTotalsBarChart';
import { buildOptionSeries, HighlightMap } from '../../../components/results/utils';
import { ResultsMeta, RawVoteRow } from '../../../types/results';
import { SubmitterSnapshot } from '../../../types/submitterResults';

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
  const [fetchingMore, setFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
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
  }, [answeredQuestionIds]);

  const questionOptions = useMemo(() => {
    return answeredQuestionIds.map((id) => {
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
          if (typeof (responseContent as any).value === 'string') return 'text';
          if (typeof (responseContent as any).type === 'string') return (responseContent as any).type;
        }
        return undefined;
      })();

      const resolvedType = rawType || unifiedType || inferredFromResponse;
      const normalizedType = typeof resolvedType === 'string' ? resolvedType.toLowerCase() : 'unknown';

      const label = question?.question || id;

      return { id, label, type: normalizedType };
    });
  }, [answeredQuestionIds, questions, unifiedByQuestionId, snapshot]);

  useEffect(() => {
    if (!selectedQuestionId && answeredQuestionIds.length > 0) {
      setSelectedQuestionId(answeredQuestionIds[0]);
    }
  }, [answeredQuestionIds, selectedQuestionId]);

  useEffect(() => {
    latestSelectedQuestionIdRef.current = selectedQuestionId;
  }, [selectedQuestionId]);

  const selectedQuestion = selectedQuestionId
    ? questionOptions.find((q) => q.id === selectedQuestionId)
    : undefined;
  const selectedType = selectedQuestion?.type;
  const isSupportedQuestion = !selectedType
    ? true
    : selectedType.startsWith('qv') || selectedType.startsWith('qs');

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
        if (cursor) params.set('cursor', cursor);
        if (sKey) params.set('sKey', sKey);
        if (uKey) params.set('uKey', uKey);
        const response = await fetch(
          `${API_PREFIX}/survey/responses/${snapshot.uuid}/results?${params.toString()}`,
        );
        if (!response.ok) throw new Error(`Aggregated results request failed with status ${response.status}`);
        const payload: { meta: ResultsMeta; raw: RawVoteRow[]; nextCursor?: string | null } = await response.json();
        lastMeta = payload.meta;
        acc = acc.concat(payload.raw || []);
        const next = payload.nextCursor ?? null;
        if (!next) break;
        cursor = next;
      }
      if (lastMeta) setResultsMeta(lastMeta);
      // Defensive: restrict stored raw rows to the selected question's options
      const allowed = new Set((lastMeta?.optionTotals ?? []).map((o) => o.optionId));
      const filteredAcc = acc.filter((row) => allowed.has(row.optionId));
      setRawRows(filteredAcc);
      setNextCursor(null);
    } catch (error: any) {
      setResultsError(error?.message || 'Failed to load aggregated results.');
    } finally {
      setLoadingResults(false);
      setFetchingMore(false);
    }
  }, [snapshot, selectedQuestionId, isSupportedQuestion, surveyId, sKey, uKey]);

  useEffect(() => {
    if (!snapshot) return;
    if (!selectedQuestionId) return;
    if (!isSupportedQuestion) {
      setResultsMeta(null);
      setRawRows([]);
      setNextCursor(null);
      return;
    }
    setResultsMeta(null);
    setRawRows([]);
    setNextCursor(null);
    fetchAllAggregatedResults();
  }, [snapshot, selectedQuestionId, isSupportedQuestion, fetchAllAggregatedResults]);

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
    const map: HighlightMap = {};
    votes.forEach((entry: any) => {
      const optionId = entry?.optionId || entry?.optionID || entry?.id;
      if (!optionId) return;
      const valueRaw = entry?.votes ?? entry?.value ?? entry?.score ?? 0;
      const value = Number(valueRaw);
      if (!Number.isFinite(value)) return;
      map[optionId] = value;
    });
    return map;
  }, [submitterQuestionResponse]);

  // Compute allowed option IDs (array) early; sets are created within memos to avoid TDZ pitfalls
  const submitterAllowedIds = useMemo(() => {
    if (!selectedQuestionId) return undefined;
    const ids: string[] | undefined = (questions?.[selectedQuestionId] as any)?.options;
    return Array.isArray(ids) && ids.length ? ids : undefined;
  }, [questions, selectedQuestionId]);

  const optionSeries = useMemo(() => {
    const allowedSet = submitterAllowedIds ? new Set(submitterAllowedIds) : undefined;
    const totals = (resultsMeta?.optionTotals ?? []).filter(
      (t) => !allowedSet || allowedSet.has(t.optionId),
    );
    return buildOptionSeries(totals, rawRows);
  }, [resultsMeta, rawRows, submitterAllowedIds]);

  const builderTotals = useMemo(() => {
    const totals = resultsMeta?.optionTotals ?? [];
    if (!submitterAllowedIds) return totals;
    const allowedSet = new Set(submitterAllowedIds);
    return totals.filter((t) => allowedSet.has(t.optionId));
  }, [resultsMeta, submitterAllowedIds]);

  const handleRetrySnapshot = () => {
    setSnapshotError(null);
    setSnapshot(null);
    setResultsMeta(null);
    setRawRows([]);
    setNextCursor(null);
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

  const handleLoadMore = () => {
    if (nextCursor) {
      // load remaining pages
      fetchAllAggregatedResults();
    }
  };

  // allowedSubmitterSet and builderTotals defined above

  return (
    <section className="submitted-results">
      <div className="submitted-results-header">
        <div>
          <h2>Submitted Results</h2>
          <p className="status-text">
            Respondent ID: <span className="code-text">{respondentId}</span>
          </p>
          <p className="status-text">Submitted at: {submittedAt}</p>
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
          Quadratic Survey questions are currently available.
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
              <ResultsVisualizationPanel
                optionSeries={optionSeries}
                highlightValues={submitterVotes}
                meta={resultsMeta ?? undefined}
                totalCredits={totalCredits}
                onFilteredIdsChange={setFilteredIds}
              />

              <div className="results-card" style={{ marginTop: '1rem' }}>
                <h3>Option Totals</h3>
                {builderTotals.length === 0 ? (
                  <p className="status-text">No group responses yet.</p>
                ) : (
                  <>
                    <OptionTotalsBarChart
                      totals={builderTotals.map((total) => ({
                        optionId: total.optionId,
                        label: total.optionName || total.optionId,
                        sum: total.sum,
                      }))}
                      optionSeries={optionSeries}
                      filteredIds={filteredIds}
                    />
                    <table className="results-table" aria-label="Option totals">
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
                  </>
                )}
              </div>

              {nextCursor && (
                <div className="results-card" style={{ marginTop: '1rem' }}>
                  <button
                    className="primary-btn load-more-btn"
                    onClick={handleLoadMore}
                    disabled={fetchingMore}
                  >
                    {fetchingMore ? 'Loading…' : 'Load more raw votes'}
                  </button>
                </div>
              )}

              {showDebug && (
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
                          {Object.entries(submitterVotes).map(([optionId, value]) => {
                            const label =
                              builderTotals.find((opt) => opt.optionId === optionId)?.optionName ||
                              optionId;
                            const recordedAt = submitterQuestionResponse.createdTime
                              ? new Date(submitterQuestionResponse.createdTime).toLocaleString()
                              : '—';
                            return (
                              <tr key={optionId}>
                                <td>{label}</td>
                                <td>{value ?? 0}</td>
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
