import type { OptionTotal } from '../../../types/results';
import {
  computeOptionDivergenceStats,
  orderOptionIds,
  type OptionSeriesEntry,
} from '../utils';

describe('results utils: divergence stats + ordering', () => {
  it('computes population variance and includes implicit zeros', () => {
    const stats = computeOptionDivergenceStats(
      [{ id: 'r1', value: 10 }],
      3, // treat two missing respondents as 0
    );

    expect(stats.nObserved).toBe(1);
    expect(stats.nTotal).toBe(3);
    expect(stats.mean).toBeCloseTo(10 / 3, 6);
    // Var([10,0,0]) = (100/3) - (10/3)^2
    expect(stats.variance).toBeCloseTo(22.2222, 3);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(10);
    expect(stats.range).toBe(10);
  });

  it('orders by totals sum desc when orderBy=default', () => {
    const optionSeries: OptionSeriesEntry[] = [
      { optionId: 'optA', label: 'Option A', values: [{ id: 'r1', value: 1 }] },
      { optionId: 'optB', label: 'Option B', values: [{ id: 'r1', value: 1 }] },
    ];
    const optionTotals: OptionTotal[] = [
      { optionId: 'optA', optionName: 'Option A', sum: 5 },
      { optionId: 'optB', optionName: 'Option B', sum: 10 },
    ];

    const ordered = orderOptionIds(optionSeries, optionTotals, 'default', 1);
    expect(ordered.orderedOptionIds).toEqual(['optB', 'optA']);
  });

  it('orders by variance desc when orderBy=variance', () => {
    const optionSeries: OptionSeriesEntry[] = [
      { optionId: 'optA', label: 'Option A', values: [{ id: 'r1', value: 10 }] }, // variance from zeros
      {
        optionId: 'optB',
        label: 'Option B',
        values: [
          { id: 'r1', value: 4 },
          { id: 'r2', value: 4 },
          { id: 'r3', value: 4 },
        ],
      }, // zero variance
    ];
    const optionTotals: OptionTotal[] = [
      { optionId: 'optA', optionName: 'Option A', sum: 10 },
      { optionId: 'optB', optionName: 'Option B', sum: 12 },
    ];

    const ordered = orderOptionIds(optionSeries, optionTotals, 'variance', 3);
    expect(ordered.orderedOptionIds[0]).toBe('optA');
    expect(ordered.statsByOptionId.optA.variance).toBeGreaterThan(
      ordered.statsByOptionId.optB.variance,
    );
  });

  it('orders by range desc (max-min), including implicit zeros', () => {
    const optionSeries: OptionSeriesEntry[] = [
      { optionId: 'optA', label: 'Option A', values: [{ id: 'r1', value: -2 }] }, // range 2 ([-2,0,0])
      { optionId: 'optB', label: 'Option B', values: [{ id: 'r1', value: 1 }] }, // range 1 ([1,0,0])
    ];
    const optionTotals: OptionTotal[] = [
      { optionId: 'optA', optionName: 'Option A', sum: -2 },
      { optionId: 'optB', optionName: 'Option B', sum: 1 },
    ];

    const ordered = orderOptionIds(optionSeries, optionTotals, 'range', 3);
    expect(ordered.orderedOptionIds).toEqual(['optA', 'optB']);
    expect(ordered.statsByOptionId.optA.range).toBe(2);
    expect(ordered.statsByOptionId.optB.range).toBe(1);
  });
});

