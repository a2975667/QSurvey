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
