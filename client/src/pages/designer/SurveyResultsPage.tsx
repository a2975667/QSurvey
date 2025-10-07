import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import { loginSuccess } from '../../features/authSlice';
import './surveyResults.css';

interface OptionTotal {
  optionId: string;
  optionName: string;
  sum: number;
}

interface ResultsCounts {
  responses: number;
  votes: number;
  statusFilter: string;
}

interface ResultsMeta {
  surveyId: string;
  questionId: string;
  optionTotals: OptionTotal[];
  grandTotal: number;
  counts: ResultsCounts;
}

interface RawRow {
  respondentId: string;
  responseId: string;
  optionId: string;
  vote: number;
  at: string | null;
}

const PAGE_LIMIT = 50;

const SurveyResultsPage: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('questionId');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const [meta, setMeta] = useState<ResultsMeta | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionUsageMap = useMemo(() => {
    const map = new Map<string, OptionTotal>();
    (meta?.optionTotals ?? []).forEach((opt) => {
      map.set(opt.optionId, opt);
    });
    return map;
  }, [meta]);

  const fetchResults = useCallback(
    async (cursor?: string) => {
      if (!surveyId || !questionId || !auth.token) {
        return;
      }

      const useCursor = typeof cursor === 'string' && cursor.length > 0;
      if (useCursor) {
        setFetchingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({ questionId, limit: PAGE_LIMIT.toString() });
        if (useCursor && cursor) {
          params.append('cursor', cursor);
        }

        const response = await fetch(
          `${API_PREFIX}/protected/surveys/${surveyId}/results?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const refreshedToken = response.headers.get('X-New-Access-Token');
        if (refreshedToken) {
          dispatch(loginSuccess({ token: refreshedToken }));
        }

        const payload = await response.json();
        const incomingMeta: ResultsMeta = payload.meta;
        const incomingRaw: RawRow[] = payload.raw || [];
        const incomingCursor: string | null = payload.nextCursor ?? null;

        setMeta(incomingMeta);
        if (useCursor) {
          setRawRows((prev) => [...prev, ...incomingRaw]);
        } else {
          setRawRows(incomingRaw);
        }
        setNextCursor(incomingCursor);
      } catch (err: any) {
        const detail = err?.message || 'Failed to load survey results.';
        setError(detail);
      } finally {
        if (useCursor) {
          setFetchingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [auth.token, dispatch, questionId, surveyId],
  );

  useEffect(() => {
    if (surveyId && questionId && auth.token) {
      fetchResults();
    }
  }, [surveyId, questionId, auth.token, fetchResults]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      fetchResults(nextCursor);
    }
  }, [fetchResults, nextCursor]);

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
            </div>
          </div>

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

          <div className="results-card">
            <h2>Raw Votes</h2>
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
                      const timestamp = row.at ? new Date(row.at).toLocaleString() : '—';
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
            {nextCursor && (
              <button
                className="primary-btn load-more-btn"
                onClick={handleLoadMore}
                disabled={fetchingMore}
              >
                {fetchingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SurveyResultsPage;
