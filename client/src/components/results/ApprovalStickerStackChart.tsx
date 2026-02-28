import React, { useMemo, useState } from 'react';

import type { RawVoteRow } from '../../types/results';
import { SCATTER_HIGHLIGHT_COLOR, SCATTER_OTHER_COLOR } from './moveVis/ScatterPlot';

import './approvalStickerStackChart.css';

interface ApprovalStickerTotal {
  optionId: string;
  label: string;
  sum: number;
}

interface ApprovalStickerStackChartProps {
  totals: ApprovalStickerTotal[];
  rawRows: RawVoteRow[];
  submitterRespondentId?: string;
  className?: string;
}

interface StickerDot {
  dotId: string;
  respondentId: string;
  optionId: string;
  isSubmitter: boolean;
  isSynthetic: boolean;
}

interface StickerRow {
  optionId: string;
  label: string;
  total: number;
  dots: StickerDot[];
}

const toNonNegativeInteger = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
};

const normalizeVoteCount = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.round(numeric));
};

const ApprovalStickerStackChart: React.FC<ApprovalStickerStackChartProps> = ({
  totals,
  rawRows,
  submitterRespondentId,
  className,
}) => {
  const [hoveredRespondentId, setHoveredRespondentId] = useState<string | null>(null);

  const rows = useMemo<StickerRow[]>(() => {
    const rowsByOptionId = new Map<string, StickerRow>();
    totals.forEach((total) => {
      rowsByOptionId.set(total.optionId, {
        optionId: total.optionId,
        label: total.label || total.optionId,
        total: toNonNegativeInteger(total.sum),
        dots: [],
      });
    });

    rawRows.forEach((row, rowIndex) => {
      const optionId = row.optionId;
      if (!optionId) return;
      const targetRow = rowsByOptionId.get(optionId);
      if (!targetRow) return;

      const repeatCount = normalizeVoteCount(row.vote);
      for (let offset = 0; offset < repeatCount; offset += 1) {
        const fallbackId = `unknown-${optionId}-${rowIndex}-${offset}`;
        const respondentId =
          typeof row.respondentId === 'string' && row.respondentId.trim().length > 0
            ? row.respondentId
            : fallbackId;
        targetRow.dots.push({
          dotId: `${optionId}-${rowIndex}-${offset}-${respondentId}`,
          respondentId,
          optionId,
          isSubmitter: !!submitterRespondentId && respondentId === submitterRespondentId,
          isSynthetic: false,
        });
      }
    });

    rowsByOptionId.forEach((row) => {
      if (row.dots.length > row.total) {
        row.dots = row.dots.slice(0, row.total);
      }
      if (row.dots.length >= row.total) return;
      const syntheticCount = row.total - row.dots.length;
      for (let idx = 0; idx < syntheticCount; idx += 1) {
        row.dots.push({
          dotId: `${row.optionId}-synthetic-${idx}`,
          respondentId: `${row.optionId}-synthetic-${idx}`,
          optionId: row.optionId,
          isSubmitter: false,
          isSynthetic: true,
        });
      }
    });

    return totals
      .map((total) => rowsByOptionId.get(total.optionId))
      .filter(Boolean) as StickerRow[];
  }, [rawRows, submitterRespondentId, totals]);

  const respondentOptionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rows.forEach((row) => {
      row.dots.forEach((dot) => {
        if (dot.isSynthetic || dot.isSubmitter) return;
        if (!map.has(dot.respondentId)) {
          map.set(dot.respondentId, new Set<string>());
        }
        map.get(dot.respondentId)!.add(row.label);
      });
    });
    return map;
  }, [rows]);

  const hoveredSummary = useMemo(() => {
    if (!hoveredRespondentId) return null;
    const labels = respondentOptionMap.get(hoveredRespondentId);
    if (!labels || labels.size === 0) return null;
    return {
      optionsCount: labels.size,
      optionsText: Array.from(labels).slice(0, 3).join(', '),
      hasMore: labels.size > 3,
    };
  }, [hoveredRespondentId, respondentOptionMap]);

  const hoverSummaryText = hoveredSummary
    ? `This respondent supports ${hoveredSummary.optionsCount} option${
        hoveredSummary.optionsCount === 1 ? '' : 's'
      }: ${hoveredSummary.optionsText}${hoveredSummary.hasMore ? ', ...' : ''}`
    : 'Hover a blue dot to preview matching supports.';

  return (
    <div className={`approval-sticker-chart ${className || ''}`.trim()} aria-label="Approval stickers chart">
      <div className="approval-sticker-legend" aria-label="Approval vote legend">
        <span className="approval-sticker-legend-item">
          <span
            className="approval-sticker-swatch"
            style={{ backgroundColor: SCATTER_HIGHLIGHT_COLOR }}
            aria-hidden="true"
          />
          Your support
        </span>
        <span className="approval-sticker-legend-item">
          <span
            className="approval-sticker-swatch"
            style={{ backgroundColor: SCATTER_OTHER_COLOR }}
            aria-hidden="true"
          />
          Others&apos; support
        </span>
      </div>

      <ul className="approval-sticker-list">
        {rows.map((row) => (
          <li
            key={row.optionId}
            className="approval-sticker-row"
            data-testid={`approval-row-${row.optionId}`}
            data-dot-count={row.dots.length}
          >
            <span className="approval-sticker-option">{row.label}</span>
            <span className="approval-sticker-total">{row.total.toLocaleString()}</span>
            <div className="approval-sticker-track" aria-label={`${row.label} approvals`}>
              {row.dots.map((dot) => {
                const isHoverable = !dot.isSubmitter && !dot.isSynthetic;
                const isLinked = !!hoveredRespondentId && hoveredRespondentId === dot.respondentId;
                const isDimmed = !!hoveredRespondentId && !isLinked;
                const roleText = dot.isSubmitter ? 'you' : 'another respondent';
                return (
                  <button
                    key={dot.dotId}
                    type="button"
                    className={[
                      'approval-sticker-dot',
                      dot.isSubmitter ? 'is-submitter' : 'is-other',
                      isLinked ? 'is-linked' : '',
                      isDimmed ? 'is-dimmed' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      backgroundColor: dot.isSubmitter ? SCATTER_HIGHLIGHT_COLOR : SCATTER_OTHER_COLOR,
                    }}
                    onMouseEnter={() => {
                      if (!isHoverable) return;
                      setHoveredRespondentId(dot.respondentId);
                    }}
                    onFocus={() => {
                      if (!isHoverable) return;
                      setHoveredRespondentId(dot.respondentId);
                    }}
                    onMouseLeave={() => setHoveredRespondentId(null)}
                    onBlur={() => setHoveredRespondentId(null)}
                    data-testid={`approval-dot-${row.optionId}`}
                    data-option-id={dot.optionId}
                    data-respondent-id={dot.respondentId}
                    data-role={dot.isSubmitter ? 'self' : dot.isSynthetic ? 'synthetic' : 'other'}
                    aria-label={`${row.label} approval by ${roleText}`}
                    title={dot.isSubmitter ? `${row.label} approval by you` : `${row.label} approval`}
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <p
        className={`approval-sticker-hover-summary ${hoveredSummary ? 'is-active' : 'is-placeholder'}`}
        data-testid="approval-hover-summary"
        aria-live={hoveredSummary ? 'polite' : undefined}
      >
        {hoverSummaryText}
      </p>
    </div>
  );
};

export default ApprovalStickerStackChart;
