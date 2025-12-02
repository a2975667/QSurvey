import { fireEvent, render, screen } from '@testing-library/react';
import LikertQuestion from './LikertQuestion';

describe('LikertQuestion', () => {
  const question = {
    _id: 'l1',
    question: 'How satisfied are you?',
    description: '1 to 5 scale',
    scale: ['1', '2', '3', '4', '5'],
    minLabel: 'Low',
    maxLabel: 'High',
  };

  it('selects via radio buttons on desktop layout', () => {
    const onAnswer = jest.fn();
    render(
      <LikertQuestion
        question={question}
        onAnswer={onAnswer}
      />,
    );

    const option = screen.getByLabelText('3');
    fireEvent.click(option);

    expect(onAnswer).toHaveBeenCalledWith('l1', '3');
    expect((option as HTMLInputElement).checked).toBe(true);
  });

  it('supports selection via dropdown (mobile pattern)', () => {
    const onAnswer = jest.fn();
    render(
      <LikertQuestion
        question={question}
        onAnswer={onAnswer}
      />,
    );

    const dropdown = screen.getByRole('combobox', { name: 'How satisfied are you?' });
    fireEvent.change(dropdown, { target: { value: '4' } });

    expect(onAnswer).toHaveBeenCalledWith('l1', '4');
    expect((dropdown as HTMLSelectElement).value).toBe('4');
  });
});
