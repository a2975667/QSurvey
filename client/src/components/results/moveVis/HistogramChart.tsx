import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { VegaLite } from 'react-vega';
import type { VisualizationSpec, SignalListeners } from 'react-vega';

interface HistogramChartProps {
  data: Array<{ value: number; id: string }>;
  filteredData?: Array<{ value: number; id: string }>;
  title: string;
  onSelectionChange?: (selectedIds: string[]) => void;
  highlightValue?: number;
  yMax?: number;
}

const HistogramChart: React.FC<HistogramChartProps> = ({
  data,
  filteredData,
  title,
  onSelectionChange,
  highlightValue,
  yMax,
}) => {
  const titleRef = useRef<HTMLDivElement>(null);
  const brushNameRef = useRef(
    `brush_${title.replace(/\W+/g, '_')}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const brushName = brushNameRef.current;

  const lastViewRef = useRef<any>(null);
  useEffect(() => {
    return () => {
      lastViewRef.current?.finalize?.();
    };
  }, []);

  const datasets = useMemo(() => {
    const full = data.map((d) => ({
      ...d,
      isHighlighted:
        highlightValue !== undefined &&
        d.value >= highlightValue &&
        d.value < highlightValue + 1,
    }));
    const filtered = (filteredData ?? full).map((d) => ({ ...d }));
    const highlight = full.filter((d) => d.isHighlighted);
    return { full, filtered, highlight };
  }, [data, filteredData, highlightValue]);

  const spec = useMemo<VisualizationSpec>(
    () => ({
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      width: 280,
      height: 180,
      background: 'white',
      layer: [
        {
          data: { name: 'full' },
          params: [
            {
              name: brushName,
              select: { type: 'interval', encodings: ['x'] },
            },
          ],
          mark: { type: 'bar', opacity: 0.5 },
          encoding: {
            x: {
              field: 'value',
              type: 'quantitative',
              bin: { step: 1, extent: [-10.5, 10.5] },
              scale: { domain: [-10.5, 12], nice: false },
              title: 'Value',
              axis: {
                values: [
                  -10, -9, -8, -7, -6, -5, -4, -3, -2, -1,
                  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                ],
                tickMinStep: 2,
                labelAngle: 0,
                tickOffset: 6,
                labelColor: '#333',
                titleColor: '#333',
                domainColor: '#ccc',
                tickColor: '#ccc',
              },
            },
            y: {
              aggregate: 'count',
              type: 'quantitative',
              title: 'Count',
              scale: { domain: [0, Math.max(1, yMax ?? 10)] },
              axis: {
                labelColor: '#333',
                titleColor: '#333',
                domainColor: '#ccc',
                tickColor: '#ccc',
              },
            },
            color: {
              condition: { test: 'datum.isHighlighted', value: '#87CEEB' },
              value: '#999',
            },
            tooltip: [{ field: 'count', aggregate: 'count', title: 'Count' }],
          },
        },
        {
          data: { values: [{}] },
          transform: [{ calculate: 'width / 2 - 2.9 ', as: 'xc' }],
          mark: { type: 'rule', color: '#ccc', strokeWidth: 1, strokeDash: [4, 4] },
          encoding: {
            x: { field: 'xc', type: 'quantitative', scale: null },
          },
        },
        {
          data: { name: 'filtered' },
          mark: { type: 'bar', opacity: 0.8 },
          encoding: {
            x: {
              field: 'value',
              type: 'quantitative',
              bin: { step: 1, extent: [-10.5, 10.5] },
            },
            y: { aggregate: 'count', type: 'quantitative', scale: { domain: [0, Math.max(1, yMax ?? 10)] } },
            color: { value: '#0055AA' },
            opacity: {
              condition: { param: brushName, empty: true, value: 0.8 },
              value: 1,
            },
          },
        },
        {
          data: { name: 'highlight' },
          mark: { type: 'bar', fill: 'transparent', stroke: 'orange', strokeWidth: 2 },
          encoding: {
            x: { field: 'value', type: 'quantitative', bin: { step: 1 } },
            y: { aggregate: 'count', type: 'quantitative' },
          },
        },
        {
          mark: { type: 'rule', color: 'black', strokeWidth: 1 },
          encoding: { x: { datum: 0, type: 'quantitative' } },
        },
      ],
    }),
    [brushName],
  );

  const signalListeners = useMemo<SignalListeners>(
    () => ({
      [brushName]: (_name, signal) => {
        if (!onSelectionChange) return;
        const interval = (signal as { value?: [number, number] }).value;
        if (Array.isArray(interval) && interval.length === 2) {
          const [min, max] = interval;
          const ids = data
            .filter((d) => d.value >= min && d.value <= max)
            .map((d) => d.id);
          onSelectionChange(ids);
        } else {
          onSelectionChange([]);
        }
      },
    }),
    [brushName, data, onSelectionChange],
  );

  const handleNewView = useCallback((view: any) => {
    lastViewRef.current?.finalize?.();
    lastViewRef.current = view;
  }, []);

  const handleError = useCallback(
    (err: Error) => console.error(`[${title}] Vega error:`, err),
    [title],
  );

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.scrollLeft = titleRef.current.scrollWidth;
    }
  }, [title]);

  return (
    <div className="histogram-chart">
      <VegaLite
        spec={spec}
        data={datasets}
        signalListeners={signalListeners}
        onNewView={handleNewView}
        onError={handleError}
        actions={false}
      />
      <div className="scrollable-labels" ref={titleRef}>
        {title}
      </div>
    </div>
  );
};

export default HistogramChart;
