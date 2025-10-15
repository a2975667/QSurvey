import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import { loginSuccess } from '../../features/authSlice';
import ResultsVisualizationPanel from '../../components/results/ResultsVisualizationPanel';
import { buildOptionSeries } from '../../components/results/utils';
import { OptionTotal, ResultsMeta, RawVoteRow } from '../../types/results';
import './surveyResults.css';

const PAGE_LIMIT = 50;

const SurveyResultsPage: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('questionId');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const [meta, setMeta] = useState<ResultsMeta | null>(null);
  const [rawRows, setRawRows] = useState<RawVoteRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debugDefault =
    process.env.REACT_APP_RESULTS_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production';
  const [showDebugTables, setShowDebugTables] = useState<boolean>(debugDefault);

  const optionUsageMap = useMemo(() => {
    const map = new Map<string, OptionTotal>();
    (meta?.optionTotals ?? []).forEach((opt) => {
      map.set(opt.optionId, opt);
    });
    return map;
  }, [meta]);

  const optionSeries = useMemo(
    () => buildOptionSeries(meta?.optionTotals ?? [], rawRows),
    [meta, rawRows],
  );

  const fetchAllResults = useCallback(async () => {
    if (!surveyId || !questionId || !auth.token) return;
    setLoading(true);
    setError(null);
    try {
      let cursor: string | undefined = undefined;
      let acc: RawVoteRow[] = [];
      let lastMeta: ResultsMeta | null = null;
      // paginate until exhaustion
      // NOTE: PAGE_LIMIT governs request size; we loop to load all
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const params = new URLSearchParams({ questionId, limit: PAGE_LIMIT.toString() });
        if (cursor) params.append('cursor', cursor);
        const resp = await fetch(
          `${API_PREFIX}/protected/surveys/${surveyId}/results?${params.toString()}`,
          { headers: { Authorization: `Bearer ${auth.token}` } },
        );
        if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
        const refreshedToken = resp.headers.get('X-New-Access-Token');
        if (refreshedToken) dispatch(loginSuccess({ token: refreshedToken }));
        const payload = await resp.json();
        lastMeta = payload.meta as ResultsMeta;
        const page: RawVoteRow[] = payload.raw || [];
        acc = acc.concat(page);
        const next: string | null = payload.nextCursor ?? null;
        if (!next) {
          setNextCursor(null);
          break;
        }
        cursor = next;
      }
      if (lastMeta) setMeta(lastMeta);
      setRawRows(acc);
    } catch (e: any) {
      setError(e?.message || 'Failed to load survey results.');
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, [API_PREFIX, auth.token, dispatch, questionId, surveyId]);

  const fetchRemainingResults = useCallback(async () => {
    if (!surveyId || !questionId || !auth.token || !nextCursor) return;
    setFetchingMore(true);
    try {
      let cursor: string | undefined = nextCursor;
      let acc: RawVoteRow[] = [];
      let lastMeta: ResultsMeta | null = meta;
      while (cursor) {
        const params = new URLSearchParams({ questionId, limit: PAGE_LIMIT.toString() });
        params.append('cursor', cursor);
        const resp = await fetch(
          `${API_PREFIX}/protected/surveys/${surveyId}/results?${params.toString()}`,
          { headers: { Authorization: `Bearer ${auth.token}` } },
        );
        if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
        const refreshedToken = resp.headers.get('X-New-Access-Token');
        if (refreshedToken) dispatch(loginSuccess({ token: refreshedToken }));
        const payload = await resp.json();
        lastMeta = payload.meta as ResultsMeta;
        acc = acc.concat(payload.raw || []);
        cursor = payload.nextCursor ?? null;
      }
      if (lastMeta) setMeta(lastMeta);
      setRawRows((prev) => prev.concat(acc));
      setNextCursor(null);
    } catch (e) {
      // ignore for now; button remains to retry
    } finally {
      setFetchingMore(false);
    }
  }, [API_PREFIX, auth.token, dispatch, meta, nextCursor, questionId, surveyId]);

  useEffect(() => {
    if (surveyId && questionId && auth.token) {
      fetchAllResults();
    }
  }, [surveyId, questionId, auth.token, fetchAllResults]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) fetchRemainingResults();
  }, [fetchRemainingResults, nextCursor]);

  if (!surveyId) {
    return <div className="survey-results-page"><p className="status-text">Survey identifier is missing.</p></div>;
  }

  if (!questionId) {
    return (
      <div className="survey-results-page">
        <div className="results-card">
          <p>Please select a question to view results.</p>
          <button className="secondary-btn" onClick={() => navigate(`/survey/${surveyId}/edit`)}>Back to survey</button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated || !auth.token) {
    return (
      <div className="survey-results-page">
        <div className="results-card">
          <p>You must be signed in to view survey results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-results-page">
      <div className="results-header">
        <div>
          <h1>Survey Results</h1>
          <p>Survey ID: <span className="code-text">{surveyId}</span></p>
          <p>Question ID: <span className="code-text">{questionId}</span></p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn" onClick={() => navigate(`/survey/${surveyId}/edit`)}>Back to survey</button>
          <button
            className="secondary-btn"
            onClick={() => setShowDebugTables((prev) => !prev)}
          >
            {showDebugTables ? 'Hide Debug Tables' : 'Show Debug Tables'}
          </button>
        </div>
      </div>

      {error && (
        <div className="results-card error-card">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="results-card">
          <p className="status-text">Loading results...</p>
        </div>
      )}

      {!loading && !error && meta && (
        <>
          <div className="results-card">
            <h2>Summary</h2>
            <div className="summary-grid">
              <div>
                <span className="summary-label">Responses</span>
                <span className="summary-value">{meta.counts.responses}</span>
              </div>
              <div>
                <span className="summary-label">Votes</span>
                <span className="summary-value">{meta.counts.votes}</span>
              </div>
              <div>
                <span className="summary-label">Status filter</span>
                <span className="summary-value">{meta.counts.statusFilter}</span>
              </div>
              <div>
                <span className="summary-label">Grand total</span>
                <span className="summary-value">{meta.grandTotal.toLocaleString()}</span>
              </div>
              {meta.asOf && (
                <div>
                  <span className="summary-label">Snapshot as of</span>
                  <span className="summary-value">{new Date(meta.asOf).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <ResultsVisualizationPanel optionSeries={optionSeries} meta={meta} />

          <div className="results-card">
            <h2>Option Totals</h2>
            {meta.optionTotals.length === 0 ? (
              <p className="status-text">No responses yet.</p>
            ) : (
              <table className="results-table" aria-label="Option totals">
                <thead>
                  <tr>
                    <th scope="col">Option</th>
                    <th scope="col">Total votes</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.optionTotals.map((opt) => (
                    <tr key={opt.optionId}>
                      <td>{opt.optionName || opt.optionId}</td>
                      <td>{opt.sum.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {nextCursor && (
            <div className="results-card">
              <button
                className="primary-btn load-more-btn"
                onClick={handleLoadMore}
                disabled={fetchingMore}
              >
                {fetchingMore ? 'Loading…' : 'Load more raw votes'}
              </button>
            </div>
          )}

          {showDebugTables && (
            <div className="results-card">
              <h2>Raw Votes (Debug)</h2>
              {rawRows.length === 0 ? (
                <p className="status-text">No raw votes available.</p>
              ) : (
                <div className="table-scroll">
                  <table className="results-table" aria-label="Raw votes">
                    <thead>
                      <tr>
                        <th scope="col">Respondent</th>
                        <th scope="col">Response ID</th>
                        <th scope="col">Option</th>
                        <th scope="col">Vote</th>
                        <th scope="col">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.map((row, index) => {
                        const optionMeta = optionUsageMap.get(row.optionId);
                        const optionLabel = optionMeta?.optionName || row.optionId;
                        const timestamp = row.at
                          ? new Date(row.at).toLocaleString()
                          : '—';
                        return (
                          <tr key={`${row.responseId}-${row.optionId}-${index}`}>
                            <td>{row.respondentId}</td>
                            <td>{row.responseId}</td>
                            <td>{optionLabel}</td>
                            <td>{row.vote}</td>
                            <td>{timestamp}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SurveyResultsPage;
