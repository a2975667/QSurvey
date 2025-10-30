import React, { useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { format as d3Format } from 'd3-format';

import type { OptionSeriesEntry } from './utils';

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
}

const BAR_HEIGHT = 32;

const OptionTotalsBarChart: React.FC<OptionTotalsBarChartProps> = ({
  totals,
  optionSeries,
  filteredIds,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState<number>(0);

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

    return data.sort((a, b) => b.sum - a.sum);
  }, [filteredSet, optionSeriesMap, totals]);

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

    const maxSum = chartData.reduce((acc, datum) => {
      const candidate = hasFilteredOverlay && datum.filteredSum !== null
        ? Math.max(datum.sum, datum.filteredSum)
        : datum.sum;
      return candidate > acc ? candidate : acc;
    }, 0);

    const xScale = scaleLinear()
      .domain([0, Math.max(1, maxSum)])
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

    const xAxis = axisBottom(xScale).ticks(4).tickFormat(d3Format(','));
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

    // Background totals bars
    g.selectAll('.bar-total')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar-total')
      .attr('x', xScale(0))
      .attr('y', (datum) => yScale(datum.label) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('width', (datum) => xScale(datum.sum))
      .attr('fill', '#d1d5db');

    if (hasFilteredOverlay) {
      g.selectAll('.bar-filtered')
        .data(chartData)
        .join('rect')
        .attr('class', 'bar-filtered')
        .attr('x', xScale(0))
        .attr('y', (datum) => yScale(datum.label) ?? 0)
        .attr('height', yScale.bandwidth())
        .attr('width', (datum) => xScale(Math.max(0, datum.filteredSum ?? 0)))
        .attr('fill', '#4f46e5')
        .attr('opacity', 0.8);
    }

    const numberFormatter = d3Format(',');

    g.selectAll('.bar-label')
      .data(chartData)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', (datum) => {
        const primary = xScale(datum.sum);
        const secondary = hasFilteredOverlay && datum.filteredSum !== null
          ? xScale(datum.filteredSum)
          : primary;
        const labelX = Math.max(primary, secondary);
        return labelX + 8;
      })
      .attr('y', (datum) => (yScale(datum.label) ?? 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#1f2937')
      .style('font-size', '12px')
      .text((datum) => {
        if (hasFilteredOverlay && datum.filteredSum !== null) {
          return `${numberFormatter(datum.sum)} (filtered ${numberFormatter(datum.filteredSum)})`;
        }
        return numberFormatter(datum.sum);
      });
  }, [chartData, hasFilteredOverlay, width]);

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
              <span className="swatch baseline" />
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
