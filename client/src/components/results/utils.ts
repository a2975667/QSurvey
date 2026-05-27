import { OptionTotal, RawVoteRow } from '../../types/results';

export interface OptionSeriesEntry {
  optionId: string;
  label: string;
  values: Array<{ id: string; value: number }>;
}

export interface HighlightEntry {
  respondentId?: string;
  value?: number;
}

export type HighlightMap = Record<string, HighlightEntry | undefined>;

export type ResultsOrderBy = 'default' | 'variance' | 'range';

export interface OptionDivergenceStats {
  nTotal: number;
  nObserved: number;
  mean: number;
  variance: number;
  min: number;
  max: number;
  range: number;
}

export const computeOptionDivergenceStats = (
  values: Array<{ id: string; value: number }>,
  totalResponses?: number,
): OptionDivergenceStats => {
  const numericValues = values
    .map((entry) => Number(entry.value))
    .filter((value) => Number.isFinite(value));

  const nObserved = numericValues.length;
  const nTotal =
    typeof totalResponses === 'number' && Number.isFinite(totalResponses) && totalResponses > 0
      ? Math.max(nObserved, Math.floor(totalResponses))
      : nObserved;

  const sum = numericValues.reduce((acc, value) => acc + value, 0);
  const sumSquares = numericValues.reduce((acc, value) => acc + value * value, 0);

  const mean = nTotal > 0 ? sum / nTotal : 0;
  const varianceRaw = nTotal > 0 ? sumSquares / nTotal - mean * mean : 0;
  const variance = varianceRaw < 0 && varianceRaw > -1e-12 ? 0 : Math.max(0, varianceRaw);

  const nMissing = Math.max(0, nTotal - nObserved);
  let min = nObserved > 0 ? Math.min(...numericValues) : 0;
  let max = nObserved > 0 ? Math.max(...numericValues) : 0;
  if (nMissing > 0) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  return {
    nTotal,
    nObserved,
    mean,
    variance,
    min,
    max,
    range: max - min,
  };
};

export const computeDivergenceStatsByOption = (
  optionSeries: OptionSeriesEntry[],
  totalResponses?: number,
): Record<string, OptionDivergenceStats> => {
  const stats: Record<string, OptionDivergenceStats> = {};
  optionSeries.forEach((series) => {
    stats[series.optionId] = computeOptionDivergenceStats(series.values, totalResponses);
  });
  return stats;
};

export const orderOptionIds = (
  optionSeries: OptionSeriesEntry[],
  optionTotals: OptionTotal[] | undefined,
  orderBy: ResultsOrderBy,
  totalResponses?: number,
): { orderedOptionIds: string[]; statsByOptionId: Record<string, OptionDivergenceStats> } => {
  const statsByOptionId = computeDivergenceStatsByOption(optionSeries, totalResponses);

  const sumByOptionId = new Map<string, number>();
  const nameByOptionId = new Map<string, string>();

  (optionTotals ?? []).forEach((t) => {
    const sum = Number(t.sum);
    sumByOptionId.set(t.optionId, Number.isFinite(sum) ? sum : 0);
    nameByOptionId.set(t.optionId, t.optionName || t.optionId);
  });

  optionSeries.forEach((series) => {
    if (!nameByOptionId.has(series.optionId)) {
      nameByOptionId.set(series.optionId, series.label || series.optionId);
    }
    if (!sumByOptionId.has(series.optionId)) {
      const sumFromValues = series.values.reduce((acc, entry) => {
        const v = Number(entry.value);
        return Number.isFinite(v) ? acc + v : acc;
      }, 0);
      sumByOptionId.set(series.optionId, sumFromValues);
    }
  });

  const sumFor = (optionId: string) => sumByOptionId.get(optionId) ?? 0;
  const nameFor = (optionId: string) => nameByOptionId.get(optionId) ?? optionId;

  const compareDefault = (a: string, b: string) => {
    const deltaSum = sumFor(b) - sumFor(a);
    if (deltaSum !== 0) return deltaSum;
    return nameFor(a).localeCompare(nameFor(b));
  };

  const compareByMetric = (metric: keyof Pick<OptionDivergenceStats, 'variance' | 'range'>) => {
    return (a: string, b: string) => {
      const aStat = statsByOptionId[a]?.[metric] ?? 0;
      const bStat = statsByOptionId[b]?.[metric] ?? 0;
      const delta = bStat - aStat;
      if (delta !== 0) return delta;
      return compareDefault(a, b);
    };
  };

  const optionIds = optionSeries.map((series) => series.optionId);
  const orderedOptionIds = [...optionIds].sort(
    orderBy === 'variance'
      ? compareByMetric('variance')
      : orderBy === 'range'
        ? compareByMetric('range')
        : compareDefault,
  );

  return { orderedOptionIds, statsByOptionId };
};

export const orderTotalsBySumWithOriginalTie = <T extends { optionId: string; sum: number }>(
  totals: T[],
  originalOptionIds?: string[],
): T[] => {
  const fallbackOrder = totals.map((total) => total.optionId);
  const sourceOrder = Array.isArray(originalOptionIds) && originalOptionIds.length > 0
    ? originalOptionIds
    : fallbackOrder;
  const indexByOptionId = new Map<string, number>();
  sourceOrder.forEach((optionId, index) => {
    if (!indexByOptionId.has(optionId)) {
      indexByOptionId.set(optionId, index);
    }
  });

  return [...totals].sort((a, b) => {
    const aSum = Number.isFinite(a.sum) ? a.sum : 0;
    const bSum = Number.isFinite(b.sum) ? b.sum : 0;
    const sumDelta = bSum - aSum;
    if (sumDelta !== 0) return sumDelta;
    const aIndex = indexByOptionId.get(a.optionId) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = indexByOptionId.get(b.optionId) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
};

export function buildOptionSeries(
  optionTotals: OptionTotal[],
  rawRows: RawVoteRow[],
  includeOrphans: boolean = false,
): OptionSeriesEntry[] {
  const labelByOptionId = new Map<string, string>();
  optionTotals.forEach((option) => {
    labelByOptionId.set(option.optionId, option.optionName || option.optionId);
  });

  const aggregateByOption = new Map<string, Map<string, number>>();

  const allowed = new Set(optionTotals.map((o) => o.optionId));

  rawRows.forEach((row) => {
    const optionId = row.optionId;
    if (!optionId) return;
    if (!includeOrphans && !allowed.has(optionId)) return;
    const respondentId = row.respondentId || 'unknown';
    if (!aggregateByOption.has(optionId)) {
      aggregateByOption.set(optionId, new Map());
    }
    const respondentVotes = aggregateByOption.get(optionId)!;
    const previous = respondentVotes.get(respondentId) ?? 0;
    const increment = typeof row.vote === 'number' && Number.isFinite(row.vote) ? row.vote : 0;
    respondentVotes.set(respondentId, previous + increment);
  });

  const orderedOptionIds = optionTotals.map((option) => option.optionId);
  const seen = new Set(orderedOptionIds);
  if (includeOrphans) {
    // Include options that might not be present in meta.optionTotals but appear in raw rows.
    rawRows.forEach((row) => {
      const optionId = row.optionId;
      if (!optionId) return;
      if (!seen.has(optionId)) {
        orderedOptionIds.push(optionId);
        seen.add(optionId);
      }
    });
  }

  return orderedOptionIds.map((optionId) => {
    const label = labelByOptionId.get(optionId) ?? optionId;
    const respondentVotes = aggregateByOption.get(optionId) ?? new Map();
    const values = Array.from(respondentVotes.entries()).map(([id, value]) => ({
      id,
      value,
    }));
    return { optionId, label, values };
  });
}

const CJK_PATTERN = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u3000-\u303F\uFF00-\uFFEF]/;
const CJK_CHAR_WIDTH_PX = 14;
const ASCII_CHAR_WIDTH_PX = 10;

export function estimateLabelWidth(label: string): number {
  // Add CJK_CHAR_WIDTH_PX for CJK characters and ASCII_CHAR_WIDTH_PX for others
  let estimatedWidth = 0;
  for (const char of label) {
    estimatedWidth += CJK_PATTERN.test(char) ? CJK_CHAR_WIDTH_PX : ASCII_CHAR_WIDTH_PX;
  }
  return estimatedWidth;
}

export function truncateLabelToWidth(label: string, maxWidth: number): string {
  const estimatedWidth = estimateLabelWidth(label);
  if (estimatedWidth <= maxWidth) {
    return label;
  }

  // If the label is too wide, we can truncate it and add an ellipsis
  // We will estimate how many characters we can fit into maxWidth
  let currentWidth = 0;
  let maxChars = 0;
  const ellipsis = '…';
  const ellipsisWidth = estimateLabelWidth(ellipsis);
  for (const char of label) {
    const charWidth = CJK_PATTERN.test(char) ? CJK_CHAR_WIDTH_PX : ASCII_CHAR_WIDTH_PX;
    if (currentWidth + charWidth > maxWidth - ellipsisWidth) { // Reserve space for ellipsis
      break;
    }
    currentWidth += charWidth;
    maxChars++;
  }

  return label.slice(0, maxChars) + ellipsis;
}
