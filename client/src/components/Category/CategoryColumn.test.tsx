import { render, screen } from '@testing-library/react';
import { CategoryColumn } from './CategoryColumn';

jest.mock('@hello-pangea/dnd', () => ({
  __esModule: true,
  Droppable: ({ children }: { children: Function }) =>
    children(
      {
        innerRef: jest.fn(),
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false },
    ),
  Draggable: ({ children }: { children: Function }) =>
    children(
      {
        innerRef: jest.fn(),
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false },
    ),
}));

const baseProps = {
  questionId: 'q1',
  categories: ['Positive', 'Negative', 'Neutral'],
  options: {},
  optionList: [],
  view: 'organize',
};

describe('CategoryColumn empty droppable target', () => {
  it('keeps an empty main organize bin measurable before drag starts', () => {
    render(<CategoryColumn {...baseProps} category="Positive" />);

    const droppable = screen.getByTestId('category-droppable-Positive');
    expect(droppable).toHaveClass('category-droppable');
    expect(droppable).toHaveClass('empty-main-organize-bin');
  });

  it('does not add the enabled empty target to the disabled Undecided bin', () => {
    render(<CategoryColumn {...baseProps} category="Undecided" />);

    const droppable = screen.getByTestId('category-droppable-Undecided');
    expect(droppable).toHaveClass('category-droppable');
    expect(droppable).not.toHaveClass('empty-main-organize-bin');
  });

  it('does not change the compact Skip bin empty state', () => {
    render(<CategoryColumn {...baseProps} category="Skip" />);

    const droppable = screen.getByTestId('category-droppable-Skip');
    expect(droppable).toHaveClass('category-droppable');
    expect(droppable).not.toHaveClass('empty-main-organize-bin');
  });
});
