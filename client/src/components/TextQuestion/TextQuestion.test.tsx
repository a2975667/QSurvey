import { fireEvent, render, screen } from '@testing-library/react';
import TextQuestion from './TextQuestion';

describe('TextQuestion', () => {
  const baseQuestion = {
    _id: 't1',
    question: 'Describe your experience',
    description: 'Optional details',
    multiline: false,
    maxLength: 10,
  };

  it('renders single-line input and updates value with counter', () => {
    const onAnswer = jest.fn();

    render(
      <TextQuestion
        question={baseQuestion}
        onAnswer={onAnswer}
        initialText=""
      />,
    );

    const input = screen.getByPlaceholderText('Type your answer here...');
    fireEvent.change(input, { target: { value: 'Great' } });

    expect(onAnswer).toHaveBeenCalledWith('t1', 'Great');
    expect(screen.getByText('5 / 10 characters')).toBeInTheDocument();
  });

  it('respects multiline configuration', () => {
    const onAnswer = jest.fn();
    render(
      <TextQuestion
        question={{ ...baseQuestion, multiline: true }}
        onAnswer={onAnswer}
      />,
    );

    const textarea = screen.getByPlaceholderText('Type your answer here...');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });
});
