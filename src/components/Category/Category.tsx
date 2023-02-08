import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { useState, memo } from "react";
import styled from "@emotion/styled";
interface QuoteType {
  id: string;
  content: string;
}

const initial = Array.from({ length: 10 }, (v, k) => k).map((k) => {
  const custom: QuoteType = {
    id: `id-${k}`,
    content: `Quote ${k}`,
  };

  return custom;
});
const grid = 8;
function reorder<T>(
  list: Iterable<T> | ArrayLike<T>,
  startIndex: number,
  endIndex: number
){
  const result = Array.from(list) as Array<T>;
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  // console.log(result)

  return result;
};

const QuoteItem = styled.div`
  width: 200px;
  border: 1px solid grey;
  margin-bottom: ${grid}px;
  background-color: lightblue;
  padding: ${grid}px;
`;


export interface CategoryProps {
    children: React.ReactElement[] | React.ReactElement;
}
export function Category(props: CategoryProps) {
  const [state, setState] = useState({ quotes: initial });

  function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const quotes = reorder(
      state.quotes,
      result.source.index,
      result.destination.index
    );

    setState({ quotes });
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
    <Droppable droppableId="list">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          { Array.isArray(props.children) ? 
              props.children.map((child: React.ReactElement, index: number) => {
                return child;
              }) : props.children
          }
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </DragDropContext>
  );
}

 
    