import React from 'react';
import { render } from '@testing-library/react';
import OptionTotalsBarChart, {
  NEGATIVE_BAR_COLOR,
  POSITIVE_BAR_COLOR,
  ZERO_BAR_COLOR,
  computeAxisDomain,
  computeContributionOverlay,
  getBarFill,
  normalizeValueForAxisMode,
  orderOptionTotalsChartData,
} from '../OptionTotalsBarChart';

describe('OptionTotalsBarChart helpers', () => {
  it('assigns bar colors by sign', () => {
    expect(getBarFill(5)).toBe(POSITIVE_BAR_COLOR);
    expect(getBarFill(-3)).toBe(NEGATIVE_BAR_COLOR);
    expect(getBarFill(0)).toBe(ZERO_BAR_COLOR);
  });

  it('computes overlay for same-sign contribution without double counting', () => {
    const overlay = computeContributionOverlay(8, 2);
    expect(overlay).toMatchObject({
      beforeSum: 6,
      afterSum: 8,
      spanStart: 6,
      spanEnd: 8,
      beforeColor: POSITIVE_BAR_COLOR,
    });
  });

  it('computes overlay for cross-sign contributions', () => {
    const overlay = computeContributionOverlay(-4, -9);
    expect(overlay).toMatchObject({
      beforeSum: 5,
      afterSum: -4,
      spanStart: -4,
      spanEnd: 5,
      beforeColor: POSITIVE_BAR_COLOR,
    });
  });

  it('returns null when contribution is zero or undefined', () => {
    expect(computeContributionOverlay(10, 0)).toBeNull();
    expect(computeContributionOverlay(10, undefined)).toBeNull();
  });
});

describe('OptionTotalsBarChart component', () => {
  it('orders chart data by sum unless preserveOrder=true', () => {
    const base = [
      { optionId: 'a', label: 'A', sum: 1 },
      { optionId: 'b', label: 'B', sum: 10 },
    ];
    const preserved = orderOptionTotalsChartData([...base], true);
    expect(preserved.map((d) => d.label)).toEqual(['A', 'B']);

    const sorted = orderOptionTotalsChartData([...base], false);
    expect(sorted.map((d) => d.label)).toEqual(['B', 'A']);
  });

  it('computes symmetric domain by default', () => {
    expect(
      computeAxisDomain(
        [
          { sum: 4, filteredSum: null },
          { sum: -6, filteredSum: null },
        ],
        false,
        'symmetric',
      ),
    ).toEqual([-6, 6]);
  });

  it('computes non-negative domain for approval-style data', () => {
    expect(
      computeAxisDomain(
        [
          { sum: 2, filteredSum: null },
          { sum: 9, filteredSum: null },
        ],
        false,
        'nonNegative',
      ),
    ).toEqual([0, 9]);
  });

  it('clamps negative values in non-negative axis mode', () => {
    expect(normalizeValueForAxisMode(-3, 'nonNegative')).toBe(0);
    expect(normalizeValueForAxisMode(7, 'nonNegative')).toBe(7);
  });

  it('preserves signed values in symmetric axis mode', () => {
    expect(normalizeValueForAxisMode(-3, 'symmetric')).toBe(-3);
    expect(normalizeValueForAxisMode(7, 'symmetric')).toBe(7);
  });

  it('renders without throwing for minimal props', () => {
    const { container } = render(
      <OptionTotalsBarChart
        totals={[
          { optionId: 'pos', label: 'Positive', sum: 5 },
          { optionId: 'neg', label: 'Negative', sum: -3 },
        ]}
      />,
    );
    expect(container.querySelector('.option-totals-chart')).toBeInTheDocument();
  });
});
