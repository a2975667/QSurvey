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

  it('renders all scale options and labels for wider scales without trimming', () => {
    const onAnswer = jest.fn();
    const wideQuestion = {
      ...question,
      _id: 'l-wide',
      minLabel: 'Lowest',
      maxLabel: 'Highest',
      scale: ['1','2','3','4','5','6','7','8','9','10'],
    };

    const { container } = render(
      <LikertQuestion
        question={wideQuestion}
        onAnswer={onAnswer}
      />,
    );

    const radioGroup = screen.getByRole('radiogroup', { name: wideQuestion.question });
    const options = radioGroup.querySelectorAll('.likert-option');

    expect(options.length).toBe(wideQuestion.scale.length);
    expect(screen.getByText('Lowest')).toBeInTheDocument();
    expect(screen.getByText('Highest')).toBeInTheDocument();
    const firstRadio = container.querySelector('input[type="radio"]');
    expect(firstRadio?.getAttribute('name')).toBe(`likert-${wideQuestion._id}`);
  });
});
