import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import ApprovalStickerStackChart from '../ApprovalStickerStackChart';
import type { RawVoteRow } from '../../../types/results';

const row = (overrides: Partial<RawVoteRow>): RawVoteRow => ({
  respondentId: 'resp-default',
  responseId: 'response-default',
  optionId: 'opt-default',
  optionName: 'Option Default',
  vote: 1,
  at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ApprovalStickerStackChart', () => {
  it('renders sticker counts per option with submitter dots highlighted', () => {
    const rawRows: RawVoteRow[] = [
      row({ respondentId: 'self', optionId: 'opt1', optionName: 'Option 1' }),
      row({ respondentId: 'user-a', optionId: 'opt1', optionName: 'Option 1' }),
      row({ respondentId: 'user-b', optionId: 'opt1', optionName: 'Option 1' }),
      row({ respondentId: 'user-a', optionId: 'opt2', optionName: 'Option 2' }),
    ];

    render(
      <ApprovalStickerStackChart
        totals={[
          { optionId: 'opt1', label: 'Option 1', sum: 3 },
          { optionId: 'opt2', label: 'Option 2', sum: 1 },
        ]}
        rawRows={rawRows}
        submitterRespondentId="self"
      />,
    );

    const opt1Row = screen.getByTestId('approval-row-opt1');
    expect(opt1Row).toHaveAttribute('data-dot-count', '3');
    expect(screen.getAllByTestId('approval-dot-opt1')).toHaveLength(3);
    expect(screen.getAllByTestId('approval-dot-opt2')).toHaveLength(1);

    const submitterDots = screen
      .getAllByTestId('approval-dot-opt1')
      .filter((element) => element.getAttribute('data-role') === 'self');
    expect(submitterDots).toHaveLength(1);
  });

  it('links same respondent approvals across options on hover', () => {
    const rawRows: RawVoteRow[] = [
      row({ respondentId: 'user-a', optionId: 'opt1', optionName: 'Option 1' }),
      row({ respondentId: 'user-b', optionId: 'opt1', optionName: 'Option 1' }),
      row({ respondentId: 'user-a', optionId: 'opt2', optionName: 'Option 2' }),
    ];

    render(
      <ApprovalStickerStackChart
        totals={[
          { optionId: 'opt1', label: 'Option 1', sum: 2 },
          { optionId: 'opt2', label: 'Option 2', sum: 1 },
        ]}
        rawRows={rawRows}
        submitterRespondentId="self"
      />,
    );

    expect(
      screen.getByText('Hover a blue dot to preview matching supports.'),
    ).toBeInTheDocument();

    const hoverDot = screen
      .getAllByTestId('approval-dot-opt1')
      .find((element) => element.getAttribute('data-respondent-id') === 'user-a');
    expect(hoverDot).toBeDefined();
    if (!hoverDot) {
      throw new Error('Expected hover dot for respondent user-a');
    }
    fireEvent.mouseEnter(hoverDot);

    const linkedDots = screen
      .getAllByRole('button', { name: /approval by another respondent/i })
      .filter((element) => element.classList.contains('is-linked'));
    expect(linkedDots).toHaveLength(2);

    const dimmedDots = screen
      .getAllByTestId('approval-dot-opt1')
      .concat(screen.getAllByTestId('approval-dot-opt2'))
      .filter((element) => element.classList.contains('is-dimmed'));
    expect(dimmedDots).not.toHaveLength(0);
    const hoverSummary = screen.getByTestId('approval-hover-summary');
    expect(hoverSummary).toHaveClass('is-active');
    expect(screen.getByText(/This respondent supports 2 options:/i)).toBeInTheDocument();

    fireEvent.mouseLeave(hoverDot);
    expect(hoverSummary).toHaveClass('is-placeholder');
    expect(
      screen.getByText('Hover a blue dot to preview matching supports.'),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button', { name: /approval by another respondent/i })
        .filter((element) => element.classList.contains('is-linked')),
    ).toHaveLength(0);
  });
});
