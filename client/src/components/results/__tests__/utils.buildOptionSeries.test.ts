import { buildOptionSeries } from '../../results/utils';
import type { OptionTotal, RawVoteRow } from '../../../types/results';

describe('buildOptionSeries', () => {
  const optionTotals: OptionTotal[] = [
    { optionId: 'optA', optionName: 'Option A', sum: 10 },
    { optionId: 'optB', optionName: 'Option B', sum: -3 },
  ];

  const rawRows: RawVoteRow[] = [
    { respondentId: 'r1', responseId: 'x1', optionId: 'optA', vote: 5, at: '2025-04-01T00:00:00Z' },
    { respondentId: 'r2', responseId: 'x2', optionId: 'optC', vote: 7, at: '2025-04-01T00:00:01Z' }, // foreign
    { respondentId: 'r1', responseId: 'x3', optionId: 'optB', vote: -2, at: '2025-04-01T00:00:02Z' },
  ];

  it('excludes foreign optionIds by default', () => {
    const series = buildOptionSeries(optionTotals, rawRows);
    const ids = series.map((s) => s.optionId);
    expect(ids).toEqual(['optA', 'optB']);
    // Ensure optC rows were not aggregated
    expect(series.find((s) => s.optionId === 'optA')?.values.length).toBeGreaterThan(0);
    expect(series.find((s) => s.optionId === 'optB')?.values.length).toBeGreaterThan(0);
    expect(series.find((s) => s.optionId === 'optC')).toBeUndefined();
  });

  it('includes foreign optionIds when includeOrphans=true', () => {
    const series = buildOptionSeries(optionTotals, rawRows, true);
    const ids = series.map((s) => s.optionId);
    expect(ids).toEqual(['optA', 'optB', 'optC']);
  });
});

