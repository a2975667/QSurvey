import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_PREFIX } from '../../../config';
import { useAppSelector } from '../../../app/hooks';
import ResultsVisualizationPanel from '../../../components/results/ResultsVisualizationPanel';
import OptionTotalsBarChart from '../../../components/results/OptionTotalsBarChart';
import { buildOptionSeries, HighlightMap } from '../../../components/results/utils';
import { ResultsMeta, RawVoteRow } from '../../../types/results';
import { SubmitterSnapshot } from '../../../types/submitterResults';

const PAGE_LIMIT = 50;

interface SubmittedResultsSectionProps {
  surveyId: string;
  uuid?: string;
  sKey?: string;
  uKey?: string;
  questionResponseIds: Record<string, string>;
}

const SubmittedResultsSection: React.FC<SubmittedResultsSectionProps> = ({
  surveyId,
  uuid,
  sKey,
  uKey,
  questionResponseIds,
}) => {
  const questions = useAppSelector((state) => state.questions.byId);
  const debugDefault =
    process.env.REACT_APP_RESULTS_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production';

  const [showDebug, setShowDebug] = useState(debugDefault);
  const [snapshot, setSnapshot] = useState<SubmitterSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>();

  const [resultsMeta, setResultsMeta] = useState<ResultsMeta | null>(null);
  const [rawRows, setRawRows] = useState<RawVoteRow[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

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

  const questionOptions = useMemo(() => {
    return answeredQuestionIds.map((id) => {
      const question = questions?.[id];
      const label = question?.question || id;
      const type = question?.type?.toLowerCase?.() ?? 'unknown';
      return { id, label, type };
    });
  }, [answeredQuestionIds, questions]);

  useEffect(() => {
    if (!selectedQuestionId && answeredQuestionIds.length > 0) {
      setSelectedQuestionId(answeredQuestionIds[0]);
    }
  }, [answeredQuestionIds, selectedQuestionId]);

  const selectedQuestion = selectedQuestionId
    ? questionOptions.find((q) => q.id === selectedQuestionId)
    : undefined;
  const selectedType = selectedQuestion?.type;
  const isSupportedQuestion = !selectedType
    ? true
    : selectedType.startsWith('qv') || selectedType.startsWith('qs');

  const fetchSnapshot = useCallback(async () => {
    if (!uuid || !surveyId || snapshotLoading || snapshot) return;
    try {
      setSnapshotLoading(true);
      setSnapshotError(null);

      const params = new URLSearchParams({ surveyId });
      if (sKey) params.append('sKey', sKey);
      if (uKey) params.append('uKey', uKey);

      const response = await fetch(
        `${API_PREFIX}/survey/responses/${uuid}?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Snapshot request failed with status ${response.status}`);
      }

      const data: SubmitterSnapshot = await response.json();
      setSnapshot(data);

      if (!selectedQuestionId) {
        const firstId =
          answeredQuestionIds[0] || data.questionResponses?.[0]?.questionId;
        if (firstId) {
          setSelectedQuestionId(firstId);
        }
      }
    } catch (error: any) {
      setSnapshotError(error?.message || 'Failed to load results snapshot.');
    } finally {
      setSnapshotLoading(false);
    }
  }, [uuid, surveyId, sKey, uKey, answeredQuestionIds, selectedQuestionId, snapshot, snapshotLoading]);

  useEffect(() => {
    if (uuid && surveyId) {
      fetchSnapshot();
    }
  }, [uuid, surveyId, fetchSnapshot]);

  const fetchAllAggregatedResults = useCallback(async () => {
    if (!snapshot || !selectedQuestionId || !isSupportedQuestion || !surveyId) return;
    setLoadingResults(true);
    setResultsError(null);
    try {
      let cursor: string | undefined = undefined;
      let acc: RawVoteRow[] = [];
      let lastMeta: ResultsMeta | null = null;
      while (true) {
        const params = new URLSearchParams({
          surveyId,
          questionId: selectedQuestionId,
          limit: PAGE_LIMIT.toString(),
        });
        if (cursor) params.append('cursor', cursor);
        if (sKey) params.append('sKey', sKey);
        if (uKey) params.append('uKey', uKey);
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
      setRawRows(acc);
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

  const optionSeries = useMemo(() => {
    const totals = resultsMeta?.optionTotals ?? [];
    return buildOptionSeries(totals, rawRows);
  }, [resultsMeta, rawRows]);

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

  const builderTotals = resultsMeta?.optionTotals ?? [];

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
