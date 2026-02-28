import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdBarChart, MdScatterPlot } from 'react-icons/md';
import HistogramChart from './moveVis/HistogramChart';
import ScatterPlot from './moveVis/ScatterPlot';
import type { OptionDivergenceStats, OptionSeriesEntry, HighlightMap, ResultsOrderBy } from './utils';
import { ResultsMeta } from '../../types/results';
import './moveVis/moveVis.css';

type ViewKey = 'histogram' | 'dots';

interface ResultsVisualizationPanelProps {
  optionSeries: OptionSeriesEntry[];
  highlightValues?: HighlightMap;
  meta?: ResultsMeta | null;
  viewSelector?: boolean;
  totalCredits?: number; // optional hint for scatter x-domain
  onFilteredIdsChange?: (ids: string[]) => void;
  orderBy?: ResultsOrderBy;
  onOrderByChange?: (orderBy: ResultsOrderBy) => void;
  statsByOptionId?: Record<string, OptionDivergenceStats>;
}

const DEFAULT_VIEW: ViewKey = 'dots';

const ResultsVisualizationPanel: React.FC<ResultsVisualizationPanelProps> = ({
  optionSeries,
  highlightValues = {},
  meta,
  viewSelector = true,
  totalCredits,
  onFilteredIdsChange,
  orderBy = 'default',
  onOrderByChange,
  statsByOptionId = {},
}) => {
  const [currentView, setCurrentView] = useState<ViewKey>(DEFAULT_VIEW);
  const [activeSelections, setActiveSelections] = useState<Record<string, string[]>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hasData = optionSeries.some((series) => series.values.length > 0);

  // Compute global max bin count across all histograms (bin width 1, extent [-10.5, 10.5])
  const yMax = useMemo(() => {
    let globalMax = 0;
    optionSeries.forEach((series) => {
      const counts: Record<number, number> = {};
      series.values.forEach(({ value }) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return;
        const bucket = Math.max(-10, Math.min(10, Math.round(value)));
        counts[bucket] = (counts[bucket] || 0) + 1;
      });
      const seriesMax = Object.values(counts).reduce((m, c) => (c > m ? c : m), 0);
      if (seriesMax > globalMax) globalMax = seriesMax;
    });
    return Math.max(1, globalMax);
  }, [optionSeries]);

  // Determine x-domain for scatter plot: prefer sqrt(totalCredits), else observed max abs (>=10)
  const xMaxAbs = useMemo(() => {
    if (typeof totalCredits === 'number' && totalCredits > 0) {
      const cap = Math.sqrt(totalCredits);
      if (Number.isFinite(cap) && cap > 0) return cap;
    }
    // fallback: observed max abs across all series, but at least 10
    const maxObserved = optionSeries.reduce((acc, series) => {
      const m = series.values.reduce((m2, { value }) => {
        const a = Math.abs(Number(value) || 0);
        return a > m2 ? a : m2;
      }, 0);
      return m > acc ? m : acc;
    }, 0);
    return Math.max(10, maxObserved);
  }, [totalCredits, optionSeries]);

  const filteredIds = useMemo(() => {
    const selections = Object.values(activeSelections).filter(
      (ids) => Array.isArray(ids) && ids.length > 0,
    );
    if (!selections.length) {
      return [];
    }
    if (selections.length === 1) {
      return selections[0];
    }
    return selections.reduce<string[]>(
      (acc, ids) => acc.filter((id) => ids.includes(id)),
      selections[0],
    );
  }, [activeSelections]);

  useEffect(() => {
    if (onFilteredIdsChange) {
      onFilteredIdsChange(filteredIds);
    }
  }, [filteredIds, onFilteredIdsChange]);

  const handleSelectionChange = useCallback((seriesKey: string, ids: string[]) => {
    setActiveSelections((prev) => {
      const next = { ...prev };
      if (!ids.length) {
        delete next[seriesKey];
      } else {
        next[seriesKey] = ids;
      }
      return next;
    });
  }, []);

  const summaryText = useMemo(() => {
    if (!meta) return null;
    const responses = meta.counts?.responses ?? 0;
    const votes = meta.counts?.votes ?? 0;
    const asOf = meta.asOf ? new Date(meta.asOf).toLocaleString() : undefined;
    return {
      responses,
      votes,
      asOf,
      status: meta.counts?.statusFilter ?? 'Complete',
    };
  }, [meta]);

  const filteredSet = useMemo(() => {
    return filteredIds.length ? new Set(filteredIds) : undefined;
  }, [filteredIds]);

  const formatMetricValue = useCallback((value: number) => {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-9) return String(rounded);
    return value.toFixed(2).replace(/\.?0+$/, '');
  }, []);

  const buildSeriesTitle = useCallback(
    (label: string, optionId: string) => {
      if (orderBy === 'default') return label;
      const stats = statsByOptionId?.[optionId];
      if (!stats) return label;
      if (orderBy === 'variance') {
        return `${label} (Var ${formatMetricValue(stats.variance)})`;
      }
      return `${label} (Range ${formatMetricValue(stats.min)}..${formatMetricValue(stats.max)})`;
    },
    [formatMetricValue, orderBy, statsByOptionId],
  );

  return (
    <section className="mv-panel">
      <div className="mv-header">
        <div>
          <p className="panel-overline">Breakdown</p>
          <p className="panel-subtitle">Explore distributions and individual votes</p>
        </div>
        {viewSelector && (
          <div className="mv-toolbar">
            <div className="view-toggle" role="group" aria-label="Visual insights view">
              <button
                type="button"
                className={`toggle-btn ${currentView === 'dots' ? 'active' : ''}`}
                aria-pressed={currentView === 'dots'}
                onClick={() => setCurrentView('dots')}
                aria-label="Show dots view"
              >
                <MdScatterPlot aria-hidden="true" />
                <span>Dots</span>
              </button>
              <button
                type="button"
                className={`toggle-btn ${currentView === 'histogram' ? 'active' : ''}`}
                aria-pressed={currentView === 'histogram'}
                onClick={() => setCurrentView('histogram')}
                aria-label="Show histogram view"
              >
                <MdBarChart aria-hidden="true" />
                <span>Histogram</span>
              </button>
            </div>
            {onOrderByChange && (
              <div className="mv-order-by">
                <label htmlFor="mv-order-by-select">Order by</label>
                <select
                  id="mv-order-by-select"
                  value={orderBy}
                  onChange={(e) => onOrderByChange(e.target.value as ResultsOrderBy)}
                  aria-label="Order options by"
                >
                  <option value="default">Total</option>
                  <option value="variance">Variance</option>
                  <option value="range">Range</option>
                </select>
              </div>
            )}
            {filteredIds.length > 0 && (
              <span className="mv-badge">Filtered: {filteredIds.length}</span>
            )}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setActiveSelections({});
                setHoveredId(null);
              }}
              disabled={filteredIds.length === 0 && Object.keys(activeSelections).length === 0}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {!hasData ? (
        <p style={{ margin: 0, color: '#4b5563' }}>
          No votes have been recorded yet for this question.
        </p>
      ) : (
        <div className="mv-grid">
          {optionSeries.map(({ optionId, label, values }) => {
            const title = buildSeriesTitle(label, optionId);
            const highlightEntry = highlightValues?.[optionId];
            const highlightValue = highlightEntry?.value;
            let highlightId: string | undefined;
            if (highlightEntry?.respondentId) {
              const match = values.find((entry) => entry.id === highlightEntry.respondentId);
              if (match) highlightId = match.id;
            }
            if (!highlightId && typeof highlightValue === 'number') {
              const matchedByValue = values.find(
                (entry) => Number(entry.value) === Number(highlightValue),
              );
              if (matchedByValue) highlightId = matchedByValue.id;
            }
            const filteredValues = filteredSet
              ? values.filter((entry) => filteredSet.has(entry.id))
              : undefined;

            if (currentView === 'histogram') {
              return (
                <HistogramChart
                  key={optionId}
                  data={values}
                  filteredData={filteredValues}
                  title={title}
                  highlightValue={highlightValue}
                  yMax={yMax}
                  onSelectionChange={(ids) => handleSelectionChange(optionId, ids)}
                />
              );
            }
            return (
              <ScatterPlot
                key={optionId}
                data={values}
                title={title}
                highlightValue={highlightValue}
                highlightedId={highlightId}
                selectedIds={filteredIds}
                onBrush={(ids) => handleSelectionChange(optionId, ids)}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                xMaxAbs={xMaxAbs}
              />
            );
          })}
        </div>
      )}

      {summaryText && (
        <div className="mv-footer">
          <span>
            <strong>Status:</strong> {summaryText.status}
          </span>
          {summaryText.asOf && (
            <span>
              <strong>Snapshot as of:</strong> {summaryText.asOf}
            </span>
          )}
        </div>
      )}
    </section>
  );
};

export default ResultsVisualizationPanel;
