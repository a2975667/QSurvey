import { useEffect, useRef } from 'react';

import {
  select,
  type Selection,
} from 'd3-selection';
import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';
import { scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { brushX, type D3BrushEvent } from 'd3-brush';

interface ScatterPlotProps {
  data: Array<{ id: string; value: number }>;
  title: string;
  width?: number;
  height?: number;
  r?: number;
  highlightValue?: number;
  highlightedId?: string | null;
  onBrush?: (ids: string[]) => void;
  selectedIds?: string[];
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  xMaxAbs?: number; // optional external x-domain bound
}

interface NodeDatum extends SimulationNodeDatum {
  id: string;
  value: number;
  highlight: boolean;
  x?: number;
  y?: number;
}

export const SCATTER_HIGHLIGHT_COLOR = 'orange';
export const SCATTER_OTHER_COLOR = '#6395cf';

const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  title,
  width = 280,
  height = 180,
  r = 10,
  highlightValue,
  highlightedId = null,
  onBrush = () => {},
  selectedIds = [],
  hoveredId = null,
  onHover = () => {},
  xMaxAbs,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const maxAbs = typeof xMaxAbs === 'number' && xMaxAbs > 0
      ? xMaxAbs
      : Math.max(10, ...data.map((d) => Math.abs(Number(d.value) || 0)));
    const xScale = scaleLinear().domain([-maxAbs, maxAbs]).range([r, width - r]);
    const baselineY = height / 2;

    const clampedHighlightValue =
      highlightValue !== undefined && !Number.isNaN(highlightValue)
        ? Math.max(-10, Math.min(10, highlightValue))
        : undefined;

    const nodes: NodeDatum[] = data
      .map((d): NodeDatum => ({
        id: d.id,
        value: Math.max(-10, Math.min(10, d.value)),
        highlight: false,
      }))
      .filter((d) => !Number.isNaN(d.value));

    let resolvedHighlightId: string | undefined;
    if (highlightedId) {
      resolvedHighlightId = nodes.find((node) => node.id === highlightedId)?.id;
    }
    if (!resolvedHighlightId && clampedHighlightValue !== undefined) {
      resolvedHighlightId = nodes.find((node) => node.value === clampedHighlightValue)?.id;
    }
    if (resolvedHighlightId) {
      nodes.forEach((node) => {
        if (node.id === resolvedHighlightId) {
          node.highlight = true;
        }
      });
    }

    forceSimulation(nodes)
      .force('x', forceX<NodeDatum>((d: NodeDatum) => xScale(d.value)).strength(0.8))
      .force('y', forceY<NodeDatum>(baselineY).strength(1))
      .force('collide', forceCollide<NodeDatum>(r + 0.5))
      .stop()
      .tick(300);

    const tooltip = select('body')
      .append('div')
      .attr('class', 'scatter-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '4px 6px')
      .style('border-radius', '4px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '10');

    const svg = select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);
    svg.selectAll('*').remove();

    const brush = brushX()
      .extent([
        [0, 0],
        [width, height],
      ])
      .filter(
        (e: MouseEvent) =>
          e.button === 0 && (e.target as Element).tagName !== 'circle',
      )
      .on('end', (event) => {
        const evt = event as D3BrushEvent<NodeDatum>;
        if (!evt.selection) {
          onBrush([]);
          return;
        }
        const [x0, x1] = evt.selection as [number, number];
        onBrush(
          nodes
            .filter((n) => !n.highlight && n.x! >= x0 && n.x! <= x1)
            .map((n) => n.id),
        );
      });

    svg.append('g').call(brush as any);

    svg
      .append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'grey')
      .attr('stroke-dasharray', '4,2');

    svg
      .append('g')
      .attr('transform', `translate(0,${baselineY})`)
      .call(axisBottom(xScale).ticks(5))
      .selectAll('path,line')
      .attr('stroke', '#aaa');

    const circlesEnter = svg
      .selectAll<SVGCircleElement, NodeDatum>('circle.dot')
      .data(nodes, (d: NodeDatum) => d.id)
      .join('circle')
      .attr('class', 'dot')
      .attr('r', r)
      .attr('fill', (d: NodeDatum) =>
        (d.highlight ? SCATTER_HIGHLIGHT_COLOR : SCATTER_OTHER_COLOR))
      .on('mouseover', (_evt: MouseEvent, d: NodeDatum) => {
        if (!d.highlight) {
          onHover(d.id);
          tooltip
            .style('visibility', 'visible')
            .text(`Respondent: ${d.id}, Value: ${d.value}`);
        }
      })
      .on('mousemove', (e: MouseEvent) =>
        tooltip.style('top', `${e.pageY - 12}px`).style('left', `${e.pageX + 12}px`),
      )
      .on('mouseout', () => {
        onHover(null);
        tooltip.style('visibility', 'hidden');
      });

    circlesEnter
      .attr('cx', (d: NodeDatum) => d.x || 0)
      .attr('cy', (d: NodeDatum) => d.y || baselineY)
      .attr('stroke', (d: NodeDatum) => (selectedIds.includes(d.id) ? '#000' : 'none'))
      .attr('stroke-width', (d: NodeDatum) => (selectedIds.includes(d.id) ? 2 : 0))
      .attr('opacity', (d: NodeDatum) => {
        if (d.highlight) return 1;
        if (selectedIds.length && !selectedIds.includes(d.id)) return 0.2;
        if (hoveredId && hoveredId !== d.id) return 0.2;
        return 1;
      });

    return () => {
      tooltip.remove();
    };
  }, [
    data,
    highlightValue,
    highlightedId,
    width,
    height,
    r,
    onBrush,
    selectedIds,
    hoveredId,
    onHover,
    xMaxAbs,
  ]);

  return (
    <div className="histogram-chart scatter-chart">
      <svg ref={svgRef} style={{ overflow: 'visible' }} />
      <div style={{ textAlign: 'center', marginTop: 4, fontWeight: 'bold' }}>
        {title}
      </div>
    </div>
  );
};

export default ScatterPlot;
