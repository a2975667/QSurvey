import { formatScatterTooltipText } from '../moveVis/ScatterPlot';

describe('ScatterPlot tooltip text', () => {
  it('formats hover tooltip with value only', () => {
    const text = formatScatterTooltipText(2);
    expect(text).toBe('Value: 2');
    expect(text).not.toMatch(/respondent:/i);
  });
});
