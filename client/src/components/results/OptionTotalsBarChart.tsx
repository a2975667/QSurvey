import React, { useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { format as d3Format } from 'd3-format';

import type { OptionSeriesEntry } from './utils';

export const POSITIVE_BAR_COLOR = '#6395cf';
export const NEGATIVE_BAR_COLOR = 'orange';
export const ZERO_BAR_COLOR = '#d1d5db';

export const getBarFill = (value: number) => {
  if (value > 0) return POSITIVE_BAR_COLOR;
  if (value < 0) return NEGATIVE_BAR_COLOR;
  return ZERO_BAR_COLOR;
};

export interface ContributionOverlay {
  beforeSum: number;
  afterSum: number;
  spanStart: number;
  spanEnd: number;
  beforeColor: string;
}

export const computeContributionOverlay = (
  total: number,
  contribution: number | undefined,
): ContributionOverlay | null => {
  if (!contribution || !Number.isFinite(contribution) || contribution === 0) {
    return null;
  }
  const beforeSum = total - contribution;
  if (beforeSum === total) return null;
  const spanStart = Math.min(beforeSum, total);
  const spanEnd = Math.max(beforeSum, total);
  return {
    beforeSum,
    afterSum: total,
    spanStart,
    spanEnd,
    beforeColor: getBarFill(beforeSum),
  };
};

interface OptionTotalDatum {
  optionId: string;
  label: string;
  sum: number;
}

interface ChartDatum extends OptionTotalDatum {
  filteredSum: number | null;
}

interface OptionTotalsBarChartProps {
  totals: OptionTotalDatum[];
  optionSeries?: OptionSeriesEntry[];
  filteredIds?: string[];
  className?: string;
  selfContribution?: Record<string, number | undefined>;
  preserveOrder?: boolean;
  axisMode?: 'symmetric' | 'nonNegative';
}

const BAR_HEIGHT = 32;

export const orderOptionTotalsChartData = <T extends { sum: number; label: string }>(
  data: T[],
  preserveOrder: boolean,
) => {
  if (preserveOrder) {
    return data;
  }
  return data.sort((a, b) => b.sum - a.sum);
};

export const computeAxisDomain = (
  chartData: Array<{ sum: number; filteredSum: number | null }>,
  hasFilteredOverlay: boolean,
  axisMode: 'symmetric' | 'nonNegative',
): [number, number] => {
  const maxMagnitude = chartData.reduce((acc, datum) => {
    const candidates = [datum.sum];
    if (hasFilteredOverlay && datum.filteredSum !== null) {
      candidates.push(datum.filteredSum);
    }
    const localMax = candidates.reduce((m, value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return m;
      if (axisMode === 'nonNegative') {
        return Math.max(m, Math.max(0, numeric));
      }
      return Math.max(m, Math.abs(numeric));
    }, 0);
    return Math.max(acc, localMax);
  }, 0);

  const domainMax = maxMagnitude === 0 ? 1 : maxMagnitude;
  if (axisMode === 'nonNegative') {
    return [0, domainMax];
  }
  return [-domainMax, domainMax];
};

const OptionTotalsBarChart: React.FC<OptionTotalsBarChartProps> = ({
  totals,
  optionSeries,
  filteredIds,
  className,
  selfContribution,
  preserveOrder = false,
  axisMode = 'symmetric',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);

  // Track width via ResizeObserver for responsive rendering.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const initialWidth = element.getBoundingClientRect().width;
    setWidth(initialWidth);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const filteredSet = useMemo(() => {
    if (!filteredIds || filteredIds.length === 0) return null;
    return new Set(filteredIds);
  }, [filteredIds]);

  const optionSeriesMap = useMemo(() => {
    if (!optionSeries) return new Map<string, OptionSeriesEntry>();
    return new Map(optionSeries.map((entry) => [entry.optionId, entry]));
  }, [optionSeries]);

  const contributionMap = useMemo(() => {
    if (!selfContribution) return undefined;
    const entries = Object.entries(selfContribution).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    );
    if (!entries.length) return undefined;
    return new Map(entries);
  }, [selfContribution]);

  const chartData = useMemo<ChartDatum[]>(() => {
    const base = totals.map((total) => ({
      optionId: total.optionId,
      label: total.label,
      sum: Number.isFinite(total.sum) ? total.sum : 0,
    }));

    const data = base.map((entry) => {
      if (!filteredSet) {
        return { ...entry, filteredSum: null };
      }
      const optionEntry = optionSeriesMap.get(entry.optionId);
      if (!optionEntry) {
        return { ...entry, filteredSum: 0 };
      }
      const filteredSum = optionEntry.values.reduce((acc, value) => {
        if (!filteredSet.has(value.id)) return acc;
        const numeric = Number(value.value);
        return Number.isFinite(numeric) ? acc + numeric : acc;
      }, 0);
      return { ...entry, filteredSum };
    });

    return orderOptionTotalsChartData(data, preserveOrder);
  }, [filteredSet, optionSeriesMap, preserveOrder, totals]);

  const hasFilteredOverlay = filteredSet !== null;

  useEffect(() => {
    if (!svgRef.current) return;
    if (!width) return;
    if (!chartData.length) {
      select(svgRef.current).selectAll('*').remove();
      return;
    }

    const longestLabel = chartData.reduce((acc, datum) => {
      return datum.label.length > acc ? datum.label.length : acc;
    }, 0);

    const margin = {
      top: 12,
      right: 48,
      bottom: 36,
      left: Math.min(260, Math.max(140, longestLabel * 7)),
    };

    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const barAreaHeight = BAR_HEIGHT * chartData.length;
    const height = margin.top + margin.bottom + barAreaHeight;

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Option totals overview');

    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const [domainMin, domainMax] = computeAxisDomain(chartData, hasFilteredOverlay, axisMode);

    const xScale = scaleLinear()
      .domain([domainMin, domainMax])
      .nice()
      .range([0, innerWidth]);

    const yScale = scaleBand()
      .domain(chartData.map((datum) => datum.label))
      .range([0, barAreaHeight])
      .padding(0.2);

    const axisColor = '#9ca3af';

    const yAxis = axisLeft(yScale).tickSize(0);
    g.append('g')
      .attr('class', 'totals-axis totals-axis-y')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#374151')
      .style('font-size', '13px');

    g.selectAll('.totals-axis-y .domain').attr('stroke', 'none');

    const xAxis = axisBottom(xScale).ticks(5).tickFormat(d3Format(','));
    g.append('g')
      .attr('class', 'totals-axis totals-axis-x')
      .attr('transform', `translate(0,${barAreaHeight})`)
      .call(xAxis);

    g.selectAll('.totals-axis-x .domain')
      .attr('stroke', axisColor);

    g.selectAll('.totals-axis-x .tick line')
      .attr('stroke', axisColor)
      .attr('stroke-dasharray', '2,2');

    g.append('text')
      .attr('x', innerWidth)
      .attr('y', barAreaHeight + 28)
      .attr('fill', '#4b5563')
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .text('Votes');

    const baselineX = xScale(0);
    const barMetrics = (value: number) => {
      const numericValue = Number.isFinite(value) ? value : 0;
      const plottedValue = axisMode === 'nonNegative' ? Math.max(0, numericValue) : numericValue;
      const xValue = xScale(plottedValue);
      return {
        x: plottedValue >= 0 ? baselineX : xValue,
        width: Math.abs(xValue - baselineX),
      };
    };

    // Background totals bars
    g.selectAll('.bar-total')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar-total')
      .attr('x', (datum) => barMetrics(datum.sum).x)
      .attr('y', (datum) => yScale(datum.label) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('width', (datum) => barMetrics(datum.sum).width)
      .attr('fill', (datum) => getBarFill(datum.sum))
      .on('mouseenter', (_evt: MouseEvent, datum: ChartDatum) => {
        setHoveredOptionId(datum.optionId);
      })
      .on('mouseleave', () => setHoveredOptionId(null));

    if (hasFilteredOverlay) {
      g.selectAll('.bar-filtered')
        .data(chartData)
        .join('rect')
        .attr('class', 'bar-filtered')
        .attr('x', (datum) => barMetrics(datum.filteredSum ?? 0).x)
        .attr('y', (datum) => yScale(datum.label) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('width', (datum) => barMetrics(datum.filteredSum ?? 0).width)
        .attr('fill', (datum) =>
          getBarFill((datum.filteredSum ?? 0) || datum.sum),
        )
        .attr('opacity', 0.8);
    }

    if (hoveredOptionId && contributionMap?.has(hoveredOptionId)) {
      const hoveredDatum = chartData.find((datum) => datum.optionId === hoveredOptionId);
      if (hoveredDatum) {
        const overlay = computeContributionOverlay(
          hoveredDatum.sum,
          contributionMap.get(hoveredOptionId),
        );
        if (overlay) {
          if (overlay.beforeSum !== 0) {
            g.append('rect')
              .attr('class', 'bar-before')
              .attr('x', barMetrics(overlay.beforeSum).x)
              .attr('y', yScale(hoveredDatum.label) ?? 0)
              .attr('height', yScale.bandwidth())
              .attr('width', barMetrics(overlay.beforeSum).width)
              .attr('fill', overlay.beforeColor)
              .attr('opacity', 0.25)
              .attr('pointer-events', 'none')
              .attr('data-before-sum', String(overlay.beforeSum));
          }
          if (overlay.spanStart !== overlay.spanEnd) {
            const xStart = xScale(overlay.spanStart);
            const xEnd = xScale(overlay.spanEnd);
            g.append('rect')
              .attr('class', 'bar-change')
              .attr('x', Math.min(xStart, xEnd))
              .attr('y', yScale(hoveredDatum.label) ?? 0)
              .attr('height', yScale.bandwidth())
              .attr('width', Math.abs(xEnd - xStart))
              .attr('fill', 'transparent')
              .attr('stroke', '#111827')
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', '4,2')
              .attr('pointer-events', 'none')
              .attr('data-change-start', String(overlay.spanStart))
              .attr('data-change-end', String(overlay.spanEnd));
          }
        }
      }
    }

    const numberFormatter = d3Format(',');

    const labelMetrics = (datum: ChartDatum) => {
      const primary = xScale(datum.sum);
      const secondary = hasFilteredOverlay && datum.filteredSum !== null
        ? xScale(datum.filteredSum)
        : primary;
      const primaryDistance = Math.abs(primary - baselineX);
      const secondaryDistance = Math.abs(secondary - baselineX);
      const farthest = primaryDistance >= secondaryDistance ? primary : secondary;
      const positiveSide = farthest >= baselineX;
      return {
        x: positiveSide ? farthest + 8 : farthest - 8,
        anchor: positiveSide ? 'start' : 'end',
      };
    };

    g.selectAll('.bar-label')
      .data(chartData)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', (datum) => labelMetrics(datum).x)
      .attr('y', (datum) => (yScale(datum.label) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (datum) => labelMetrics(datum).anchor as any)
      .attr('fill', '#1f2937')
      .style('font-size', '12px')
      .text((datum) => {
        if (hasFilteredOverlay && datum.filteredSum !== null) {
          return `${numberFormatter(datum.sum)} (filtered ${numberFormatter(datum.filteredSum)})`;
        }
        return numberFormatter(datum.sum);
      });
  }, [chartData, hasFilteredOverlay, width, hoveredOptionId, contributionMap, axisMode]);

  return (
    <div ref={containerRef} className={`option-totals-chart ${className ?? ''}`}>
      {chartData.length === 0 ? (
        <p className="status-text" style={{ marginTop: '0.5rem' }}>
          No responses yet.
        </p>
      ) : (
        <>
          <svg ref={svgRef} />
          <div className="totals-legend" aria-hidden="true">
            <span className="legend-item">
              <span
                className="swatch baseline"
                style={{
                  background: `linear-gradient(90deg, ${POSITIVE_BAR_COLOR} 50%, ${NEGATIVE_BAR_COLOR} 50%)`,
                }}
              />
              Total votes
            </span>
            {hasFilteredOverlay ? (
              <span className="legend-item">
                <span className="swatch filtered" />
                Filtered selection
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default OptionTotalsBarChart;
