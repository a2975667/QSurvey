import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { API_PREFIX } from '../../config';
import { loginSuccess, logout } from '../../features/authSlice';
import { fetchProtected } from '../../lib/protectedFetch';
import { fetchSampleQuestions } from '../../features/questionsSlice';
import ResultsVisualizationPanel from '../../components/results/ResultsVisualizationPanel';
import {
  buildOptionSeries,
  orderOptionIds,
  orderTotalsBySumWithOriginalTie,
  type ResultsOrderBy,
} from '../../components/results/utils';
import OptionTotalsBarChart from '../../components/results/OptionTotalsBarChart';
import { OptionTotal, ResultsMeta, RawVoteRow } from '../../types/results';
import { MdBarChart, MdInfoOutline, MdTableChart } from 'react-icons/md';
import './surveyResults.css';
import AppShell from '../../layout/AppShell';
import UserMenu from '../../layout/UserMenu';
import { MdChevronLeft } from 'react-icons/md';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const PAGE_LIMIT = 50;

const SurveyResultsPage: React.FC = () => {
  useDocumentTitle('Results – QSurvey System');
  const { surveyId } = useParams<{ surveyId: string }>();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('questionId');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const questionsState = useAppSelector((state) => state.questions);
  const questionsById = questionsState.byId;

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
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [totalsView, setTotalsView] = useState<'chart' | 'table'>('chart');
  const [orderBy, setOrderBy] = useState<ResultsOrderBy>('variance');

  const normalizedQuestionType = (meta?.questionType || '').toLowerCase();
  const normalizedTypeKey = normalizedQuestionType.replace(/[-\s]+/g, '_');
  const isTextBlockQuestion = normalizedTypeKey === 'text_block';
  const isQvQuestion = !normalizedTypeKey || normalizedTypeKey === 'qv';
  const isLikertQuestion = normalizedTypeKey === 'likert';
  const isSelectionQuestion = normalizedTypeKey === 'selection';
  const isApprovalQuestion = normalizedTypeKey === 'approval';
  const isTextQuestion = normalizedTypeKey === 'text';
  const selectionResponseCount = meta?.counts?.responses ?? 0;
  const formatSelectionPercent = (count: number) => {
    if (!selectionResponseCount || selectionResponseCount <= 0) return null;
    const percent = Math.round((count / selectionResponseCount) * 100);
    if (!Number.isFinite(percent)) return null;
    return `${percent}%`;
  };

  const optionUsageMap = useMemo(() => {
    const map = new Map<string, OptionTotal>();
    (meta?.optionTotals ?? []).forEach((opt) => {
      map.set(opt.optionId, opt);
    });
    return map;
  }, [meta]);

  const totalCredits = useMemo(() => {
    if (!questionId) return null;
    const q: any = questionsById?.[questionId];
    const raw = q?.totalCredits ?? q?.setting?.totalCredits;
    const numeric = typeof raw === 'string' ? Number(raw) : raw;
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }, [questionsById, questionId]);

  const maxVotesPerOption = useMemo(() => {
    if (totalCredits === null) return null;
    const val = Math.sqrt(totalCredits);
    return Number.isFinite(val) ? Math.floor(val) : null;
  }, [totalCredits]);

  const avgVotesPerPerson = useMemo(() => {
    const responses = meta?.counts?.responses ?? 0;
    const votes = meta?.counts?.votes ?? 0;
    if (!responses || responses <= 0) return null;
    const avg = votes / responses;
    return Number.isFinite(avg) ? avg : null;
  }, [meta]);

  const optionsCount = useMemo(() => (meta?.optionTotals ?? []).length, [meta]);

  const allowedOptionSet = useMemo(() => {
    if (!questionId || isTextQuestion) return undefined;
    const fromQuestions = (questionsById?.[questionId] as any)?.options;
    if (Array.isArray(fromQuestions) && fromQuestions.length) {
      const ids = fromQuestions
        .map((opt: any) => (typeof opt === 'string' ? opt : opt?.optionId))
        .filter((id: any) => typeof id === 'string' && id.length > 0);
      if (ids.length) return new Set(ids);
    }
    const fromMeta = (meta?.optionTotals ?? []).map((o) => o.optionId);
    return new Set(fromMeta);
  }, [questionsById, questionId, meta, isTextQuestion]);

  const questionOptionOrder = useMemo(() => {
    if (!questionId) return [];
    const options = (questionsById?.[questionId] as any)?.options;
    if (!Array.isArray(options)) return [];
    return options
      .map((option: any) => (typeof option === 'string' ? option : option?.optionId))
      .filter((optionId: any): optionId is string => typeof optionId === 'string' && optionId.length > 0);
  }, [questionId, questionsById]);

  const filteredRawRows = useMemo(() => {
    if (isTextQuestion) return rawRows;
    if (!allowedOptionSet || allowedOptionSet.size === 0) {
      return rawRows.filter((row) => !!row.optionId);
    }
    return rawRows.filter((row) => row.optionId && allowedOptionSet.has(row.optionId));
  }, [rawRows, allowedOptionSet, isTextQuestion]);

  const optionSeries = useMemo(() => {
    if (!isQvQuestion) return [];
    const totals = (meta?.optionTotals ?? []).filter(
      (t) => !allowedOptionSet || allowedOptionSet.has(t.optionId),
    );
    return buildOptionSeries(totals, filteredRawRows);
  }, [isQvQuestion, meta, filteredRawRows, allowedOptionSet]);

  const orderedOptionTotals = useMemo(() => {
    if (!isQvQuestion) {
      return {
        orderedOptionIds: optionSeries.map((s) => s.optionId),
        statsByOptionId: {},
      };
    }
    const totals = (meta?.optionTotals ?? []).filter(
      (t) => !allowedOptionSet || allowedOptionSet.has(t.optionId),
    );
    return orderOptionIds(optionSeries, totals, orderBy, meta?.counts?.responses);
  }, [allowedOptionSet, isQvQuestion, meta, optionSeries, orderBy]);

  const orderedOptionSeries = useMemo(() => {
    const byId = new Map(optionSeries.map((series) => [series.optionId, series]));
    return orderedOptionTotals.orderedOptionIds
      .map((optionId) => byId.get(optionId))
      .filter(Boolean) as typeof optionSeries;
  }, [optionSeries, orderedOptionTotals.orderedOptionIds]);

  const filteredOptionTotals = useMemo(
    () =>
      (meta?.optionTotals ?? []).filter(
        (t) => !allowedOptionSet || allowedOptionSet.has(t.optionId),
      ),
    [meta, allowedOptionSet],
  );

  const optionTotalsForChart = useMemo(() => {
    return filteredOptionTotals.map((total) => ({
      optionId: total.optionId,
      label: total.optionName || total.optionId,
      sum: total.sum,
    }));
  }, [filteredOptionTotals]);

  const orderedTotalsForChart = useMemo(() => {
    const byId = new Map(optionTotalsForChart.map((entry) => [entry.optionId, entry]));
    return orderedOptionTotals.orderedOptionIds
      .map((optionId) => byId.get(optionId))
      .filter(Boolean) as typeof optionTotalsForChart;
  }, [optionTotalsForChart, orderedOptionTotals.orderedOptionIds]);

  const orderedTotalsForTable = useMemo(() => {
    const byId = new Map(filteredOptionTotals.map((entry) => [entry.optionId, entry]));
    return orderedOptionTotals.orderedOptionIds
      .map((optionId) => byId.get(optionId))
      .filter(Boolean) as OptionTotal[];
  }, [filteredOptionTotals, orderedOptionTotals.orderedOptionIds]);

  const approvalTotals = useMemo(() => {
    if (!isApprovalQuestion) return filteredOptionTotals;
    return orderTotalsBySumWithOriginalTie(filteredOptionTotals, questionOptionOrder);
  }, [filteredOptionTotals, isApprovalQuestion, questionOptionOrder]);

  const textResponses = useMemo(() => {
    if (!isTextQuestion) return [];
    return [...rawRows]
      .filter((row) => typeof row.text === 'string' && row.text.trim().length > 0)
      .map((row) => ({
        respondentId: row.respondentId || 'unknown',
        responseId: row.responseId || '',
        text: (row.text ?? '').trim(),
        at: row.at ?? null,
      }))
      .sort((a, b) => {
        const aTime = a.at ? new Date(a.at).getTime() : 0;
        const bTime = b.at ? new Date(b.at).getTime() : 0;
        return bTime - aTime;
      });
  }, [isTextQuestion, rawRows]);

  const handleProtectedAuthFailure = useCallback(() => {
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  const fetchAllResults = useCallback(async () => {
    if (!surveyId || !questionId || !auth.token) return;
    setLoading(true);
    setError(null);
    try {
      let cursor: string | null = null;
      let acc: RawVoteRow[] = [];
      let lastMeta: ResultsMeta | null = null;
      // paginate until exhaustion
      // NOTE: PAGE_LIMIT governs request size; we loop to load all
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const params: URLSearchParams = new URLSearchParams();
        params.set('questionId', questionId!);
        params.set('limit', PAGE_LIMIT.toString());
        if (cursor) params.set('cursor', cursor);
        const resp: Response = await fetchProtected(
          `${API_PREFIX}/protected/surveys/${surveyId}/results?${params.toString()}`,
          {},
          {
            token: auth.token,
            onTokenRefresh: (token) => dispatch(loginSuccess({ token })),
            onAuthFailure: () => handleProtectedAuthFailure(),
          },
        );
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            return;
          }
          throw new Error(`Request failed with status ${resp.status}`);
        }
        const payload: { meta: ResultsMeta; raw: RawVoteRow[]; nextCursor?: string | null } = await resp.json();
        if (payload?.meta?.questionId && payload.meta.questionId !== questionId) {
          // Ignore mismatched payloads and surface an error for debugging
          console.warn('[DesignerResults] QuestionId mismatch in results payload', {
            requested: questionId,
            received: payload?.meta?.questionId,
          });
          setError('Received results for a different question. Please retry.');
          setNextCursor(null);
          break;
        }
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
  }, [auth.token, dispatch, questionId, surveyId, handleProtectedAuthFailure]);

  const fetchRemainingResults = useCallback(async () => {
    if (!surveyId || !questionId || !auth.token || !nextCursor) return;
    setFetchingMore(true);
    try {
      let cursor: string | null = nextCursor;
      let acc: RawVoteRow[] = [];
      let lastMeta: ResultsMeta | null = meta;
      while (cursor) {
        const params: URLSearchParams = new URLSearchParams();
        params.set('questionId', questionId!);
        params.set('limit', PAGE_LIMIT.toString());
        params.set('cursor', cursor);
        const resp: Response = await fetchProtected(
          `${API_PREFIX}/protected/surveys/${surveyId}/results?${params.toString()}`,
          {},
          {
            token: auth.token,
            onTokenRefresh: (token) => dispatch(loginSuccess({ token })),
            onAuthFailure: () => handleProtectedAuthFailure(),
          },
        );
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            return;
          }
          throw new Error(`Request failed with status ${resp.status}`);
        }
        const payload: { meta: ResultsMeta; raw: RawVoteRow[]; nextCursor?: string | null } = await resp.json();
        if (payload?.meta?.questionId && payload.meta.questionId !== questionId) {
          console.warn('[DesignerResults] QuestionId mismatch in paged payload', {
            requested: questionId,
            received: payload?.meta?.questionId,
          });
          setError('Received results for a different question. Please retry.');
          setNextCursor(null);
          break;
        }
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
  }, [auth.token, dispatch, meta, nextCursor, questionId, surveyId, handleProtectedAuthFailure]);

  useEffect(() => {
    // Reset local state when switching questions to avoid transient mixed state
    setMeta(null);
    setRawRows([]);
    setFilteredIds([]);
    setNextCursor(null);
    setError(null);

    if (surveyId && questionId && auth.token) {
      fetchAllResults();
    }
  }, [surveyId, questionId, auth.token, fetchAllResults]);

  useEffect(() => {
    if (!surveyId) return;
    const hasQuestions = Object.keys(questionsById || {}).length > 0;
    if (!questionsState.loaded && !hasQuestions) {
      dispatch(fetchSampleQuestions(surveyId));
    }
  }, [surveyId, questionsState.loaded, questionsById, dispatch]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) fetchRemainingResults();
  }, [fetchRemainingResults, nextCursor]);

  const handleBackToDesigner = useCallback(() => {
    navigate('/designer');
  }, [navigate]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const appBarProps = {
    title: 'QSurvey System',
    breadcrumbs: [
      { label: 'Projects', onClick: handleBackToDesigner },
      { label: 'Results' },
    ],
    onTitleClick: () => navigate('/'),
    leading: (
      <button
        type="button"
        className="qs-top-app-bar__back"
        onClick={handleBackToDesigner}
        aria-label="Back to projects"
      >
        <MdChevronLeft className="qs-top-app-bar__back-icon" />
      </button>
    ),
    actions: auth.isAuthenticated ? (
      <UserMenu email={auth.user?.email} onLogout={handleLogout} />
    ) : undefined,
  } as const;

  if (!surveyId) {
    return (
      <AppShell appBarProps={appBarProps}>
        <div className="survey-results-page">
          <p className="status-text">Survey identifier is missing.</p>
        </div>
      </AppShell>
    );
  }

  if (!questionId) {
    return (
      <AppShell appBarProps={appBarProps}>
        <div className="survey-results-page">
          <div className="results-card">
            <p>Please select a question to view results.</p>
            <button
              className="secondary-btn"
              onClick={() => navigate(`/survey/${surveyId}/edit`)}
            >
              Back to survey
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!auth.isAuthenticated || !auth.token) {
    return (
      <AppShell appBarProps={appBarProps}>
        <div className="survey-results-page">
          <div className="results-card">
            <p>You must be signed in to view survey results.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell appBarProps={appBarProps}>
    <div className="survey-results-page">
      <div className="results-header">
        <div className="results-title">
          <h1 className="panel-title-lg">Question Results</h1>
          <button
            type="button"
            className="info-pill"
            aria-label={`Survey ID ${surveyId ?? 'unknown'}, Question ID ${questionId ?? 'unknown'}`}
            data-tooltip={`Survey ID: ${surveyId ?? 'unknown'}\nQuestion ID: ${questionId ?? 'unknown'}`}
          >
            <MdInfoOutline aria-hidden="true" />
          </button>
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
          {!isTextBlockQuestion && (
            <div className="results-card">
              <div className="results-card-header">
                <div>
                  <p className="panel-overline">Survey Overview</p>
                  <p className="panel-subtitle">Key counts for this question</p>
                </div>
              </div>
              <div className="summary-grid">
                <div>
                  <span className="summary-label">Responses</span>
                  <span className="summary-value">{meta.counts.responses}</span>
                </div>
                <div>
                  <span className="summary-label">Options</span>
                  <span className="summary-value">{optionsCount}</span>
                </div>
                <div>
                  <span className="summary-label">Credits per person</span>
                  <span className="summary-value">
                    {totalCredits !== null ? totalCredits : '—'}
                  </span>
                </div>
                <div>
                  <span className="summary-label">Max votes per option</span>
                  <span className="summary-value">
                    {maxVotesPerOption !== null ? maxVotesPerOption : '—'}
                  </span>
                </div>
                <div>
                  <span className="summary-label">Avg votes per person</span>
                  <span className="summary-value">
                    {avgVotesPerPerson !== null ? avgVotesPerPerson.toFixed(1) : '—'}
                  </span>
                </div>
                {meta.asOf && (
                  <div>
                    <span className="summary-label">Snapshot as of</span>
                    <span className="summary-value">{new Date(meta.asOf).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isTextBlockQuestion && (
            <div className="results-card">
              <p className="status-text">Text blocks do not collect responses.</p>
            </div>
          )}

          {!isTextBlockQuestion && isQvQuestion && (
            <>
              <ResultsVisualizationPanel
                optionSeries={orderedOptionSeries}
                meta={meta}
                onFilteredIdsChange={setFilteredIds}
                orderBy={orderBy}
                statsByOptionId={orderedOptionTotals.statsByOptionId}
              />

              <div className="results-card">
                <div className="results-card-header">
                  <div>
                    <p className="panel-overline">Results</p>
                    <p className="panel-subtitle">Per-option sums and raw votes</p>
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
                      <label htmlFor="designer-results-order-by-select">Order by</label>
                      <select
                        id="designer-results-order-by-select"
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
                {meta.optionTotals.length === 0 ? (
                  <p className="status-text">No responses yet.</p>
                ) : (
                  <>
                    {totalsView === 'chart' ? (
                      <OptionTotalsBarChart
                        totals={orderedTotalsForChart}
                        optionSeries={orderedOptionSeries}
                        filteredIds={filteredIds}
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
                          {orderedTotalsForTable.map((opt) => (
                            <tr key={opt.optionId}>
                              <td>{opt.optionName || opt.optionId}</td>
                              <td>{opt.sum.toLocaleString()}</td>
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

          {!isTextBlockQuestion && (isLikertQuestion || isSelectionQuestion || isApprovalQuestion) && (
            <div className="results-card">
              <div className="results-card-header">
                <div>
                  <p className="panel-overline">Results</p>
                  <p className="panel-subtitle">
                    {isSelectionQuestion || isApprovalQuestion
                      ? 'Per-option counts'
                      : 'Per-selection counts'}
                  </p>
                </div>
                <div className="view-toggle" role="group" aria-label="Response totals view">
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
              {meta.optionTotals.length === 0 ? (
                <p className="status-text">No responses yet.</p>
              ) : (
                <>
                  {totalsView === 'chart' ? (
                    <OptionTotalsBarChart
                      totals={(isApprovalQuestion ? approvalTotals : filteredOptionTotals).map((opt) => ({
                        optionId: opt.optionId,
                        label: opt.optionName || opt.optionId,
                        sum: opt.sum,
                      }))}
                      optionSeries={[]}
                      filteredIds={[]}
                      axisMode={isApprovalQuestion ? 'nonNegative' : 'symmetric'}
                    />
                  ) : (
                    <table className="results-table" aria-label="Response totals">
                      <thead>
                        <tr>
                          <th scope="col">{isSelectionQuestion || isApprovalQuestion ? 'Option' : 'Selection'}</th>
                          <th scope="col">{isApprovalQuestion ? 'Total votes' : 'Responses'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isApprovalQuestion ? approvalTotals : filteredOptionTotals).map((opt) => {
                          const percentText = isSelectionQuestion
                            ? formatSelectionPercent(opt.sum)
                            : null;
                          return (
                            <tr key={opt.optionId}>
                              <td>{opt.optionName || opt.optionId}</td>
                              <td>
                                {opt.sum.toLocaleString()}
                                {percentText ? ` (${percentText})` : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}

          {!isTextBlockQuestion && isTextQuestion && (
            <div className="results-card">
              <h2>Text Responses</h2>
              {textResponses.length === 0 ? (
                <p className="status-text">No responses yet.</p>
              ) : (
                <div className="table-scroll">
                  <table className="results-table" aria-label="Text responses">
                    <thead>
                      <tr>
                        <th scope="col">Respondent</th>
                        <th scope="col">Response ID</th>
                        <th scope="col">Answer</th>
                        <th scope="col">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {textResponses.map((entry, index) => (
                        <tr key={`${entry.responseId}-${index}`}>
                          <td>{entry.respondentId}</td>
                          <td>{entry.responseId}</td>
                          <td>{entry.text}</td>
                          <td>{entry.at ? new Date(entry.at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!isTextBlockQuestion && nextCursor && (
            <div className="results-card">
              <button
                className="primary-btn load-more-btn"
                onClick={handleLoadMore}
                disabled={fetchingMore}
              >
                {fetchingMore ? 'Loading…' : 'Load more results'}
              </button>
            </div>
          )}

          {!isTextBlockQuestion && showDebugTables && isQvQuestion && (
            <div className="results-card">
              <h2>Raw Votes (Debug)</h2>
              {filteredRawRows.length === 0 ? (
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
                      {filteredRawRows.map((row, index) => {
                        const optionMeta = row.optionId ? optionUsageMap.get(row.optionId) : undefined;
                        const optionLabel = optionMeta?.optionName || row.optionId || 'Unknown option';
                        const timestamp = row.at
                          ? new Date(row.at).toLocaleString()
                          : '—';
                        return (
                          <tr key={`${row.responseId}-${row.optionId ?? 'na'}-${index}`}>
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
    </AppShell>
  );
};

export default SurveyResultsPage;
