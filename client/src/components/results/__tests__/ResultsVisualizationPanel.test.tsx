import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultsVisualizationPanel from '../ResultsVisualizationPanel';
import type { OptionSeriesEntry } from '../utils';

const mockScatterProps = jest.fn();

jest.mock('../moveVis/HistogramChart', () => {
  const React = require('react');
  return () => React.createElement('div', { 'data-testid': 'histogram-mock' });
});

jest.mock('../moveVis/ScatterPlot', () => {
  const React = require('react');
  return (props: any) => {
    mockScatterProps(props);
    return React.createElement('div', { 'data-testid': 'scatter-mock' });
  };
});

describe('ResultsVisualizationPanel', () => {
  beforeEach(() => {
    mockScatterProps.mockClear();
  });

  it('passes submitter highlight ids to the scatter plot without duplicating nodes', async () => {
    const optionSeries: OptionSeriesEntry[] = [
      {
        optionId: 'optA',
        label: 'Option A',
        values: [
          { id: 'uuid-1', value: 3 },
          { id: 'uuid-2', value: -2 },
        ],
      },
    ];

    render(
      <ResultsVisualizationPanel
        optionSeries={optionSeries}
        highlightValues={{ optA: { respondentId: 'uuid-1', value: 3 } }}
        meta={{
          surveyId: 'survey-1',
          questionId: 'question-1',
          optionTotals: [{ optionId: 'optA', optionName: 'Option A', sum: 1 }],
          grandTotal: 1,
          counts: { responses: 2, votes: 2, statusFilter: 'Complete' },
        }}
      />,
    );

    await waitFor(() => expect(mockScatterProps).toHaveBeenCalled());

    const props = mockScatterProps.mock.calls[0][0];
    expect(props.data).toHaveLength(2);
    expect(props.highlightedId).toBe('uuid-1');
    expect(props.highlightValue).toBe(3);
  });

  it('renders an order-by selector and calls onOrderByChange', async () => {
    const onOrderByChange = jest.fn();
    const optionSeries: OptionSeriesEntry[] = [
      { optionId: 'optA', label: 'Option A', values: [{ id: 'uuid-1', value: 1 }] },
    ];

    render(
      <ResultsVisualizationPanel
        optionSeries={optionSeries}
        orderBy="default"
        onOrderByChange={onOrderByChange}
      />,
    );

    const select = screen.getByLabelText(/order options by/i);
    fireEvent.change(select, { target: { value: 'variance' } });
    expect(onOrderByChange).toHaveBeenCalledWith('variance');
  });

  it('appends metric labels to subplot titles when ordering is enabled', async () => {
    const optionSeries: OptionSeriesEntry[] = [
      { optionId: 'optA', label: 'Option A', values: [{ id: 'uuid-1', value: 1 }] },
      { optionId: 'optB', label: 'Option B', values: [{ id: 'uuid-2', value: 2 }] },
    ];

    render(
      <ResultsVisualizationPanel
        optionSeries={optionSeries}
        orderBy="variance"
        onOrderByChange={() => {}}
        statsByOptionId={{
          optA: { nTotal: 1, nObserved: 1, mean: 1, variance: 1.23, min: 0, max: 2, range: 2 },
          optB: { nTotal: 1, nObserved: 1, mean: 2, variance: 0, min: 2, max: 2, range: 0 },
        }}
      />,
    );

    await waitFor(() => expect(mockScatterProps).toHaveBeenCalled());

    const titles = mockScatterProps.mock.calls.map((call) => call[0]?.title);
    expect(titles).toEqual(['Option A (Var 1.23)', 'Option B (Var 0)']);
  });
});
