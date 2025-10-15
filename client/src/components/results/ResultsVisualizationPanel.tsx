import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HistogramChart from './moveVis/HistogramChart';
import ScatterPlot from './moveVis/ScatterPlot';
import { OptionSeriesEntry, HighlightMap } from './utils';
import { ResultsMeta } from '../../types/results';
import './moveVis/moveVis.css';

type ViewKey = 'histogram' | 'dots';

interface ResultsVisualizationPanelProps {
  optionSeries: OptionSeriesEntry[];
  highlightValues?: HighlightMap;
  meta?: ResultsMeta | null;
  viewSelector?: boolean;
  totalCredits?: number; // optional hint for scatter x-domain
}

const DEFAULT_VIEW: ViewKey = 'histogram';

const ResultsVisualizationPanel: React.FC<ResultsVisualizationPanelProps> = ({
  optionSeries,
  highlightValues = {},
  meta,
  viewSelector = true,
  totalCredits,
}) => {
  const [currentView, setCurrentView] = useState<ViewKey>(DEFAULT_VIEW);
  const [activeSelections, setActiveSelections] = useState<Record<string, string[]>>({});
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
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

  useEffect(() => {
    const selections = Object.values(activeSelections).filter(
      (ids) => Array.isArray(ids) && ids.length > 0,
    );
    if (!selections.length) {
      setFilteredIds([]);
      return;
    }
    if (selections.length === 1) {
      setFilteredIds(selections[0]);
      return;
    }
    const intersection = selections.reduce<string[]>((acc, ids) =>
      acc.filter((id) => ids.includes(id)),
    selections[0]);
    setFilteredIds(intersection);
  }, [activeSelections]);

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

  return (
    <section className="mv-panel">
      <div className="mv-header">
        <h3>Visual Insights</h3>
        {viewSelector && (
          <div className="mv-toolbar">
            <label htmlFor="results-view">View:</label>
            <select
              id="results-view"
              className="mv-select"
              value={currentView}
              onChange={(event) => setCurrentView(event.target.value as ViewKey)}
            >
              <option value="histogram">Histogram</option>
              <option value="dots">Dots</option>
            </select>
            {summaryText && (
              <>
                <span className="mv-badge">Responses: {summaryText.responses}</span>
                <span className="mv-badge">Votes: {summaryText.votes}</span>
              </>
            )}
            {filteredIds.length > 0 && (
              <span className="mv-badge">Filtered: {filteredIds.length}</span>
            )}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setActiveSelections({});
                setFilteredIds([]);
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
            const highlight = highlightValues[optionId];
            const filteredValues = filteredSet
              ? values.filter((entry) => filteredSet.has(entry.id))
              : undefined;

            if (currentView === 'histogram') {
              return (
                <HistogramChart
                  key={optionId}
                  data={values}
                  filteredData={filteredValues}
                  title={label}
                  highlightValue={highlight}
                  yMax={yMax}
                  onSelectionChange={(ids) => handleSelectionChange(optionId, ids)}
                />
              );
            }
            return (
              <ScatterPlot
                key={optionId}
                data={values}
                title={label}
                highlightValue={highlight}
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
