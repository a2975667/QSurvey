import {
  DragDropContext,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { useState } from "react";
import styled from "@emotion/styled";
import { IQvOption } from "../../types/coreTypes";
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
) {
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
  options: { [key: string]: IQvOption };
  optionPosition: { [key: string]: string[] };
}

export function Category(props: CategoryProps) {

  const [state, setState] = useState({ quotes: initial });

  function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    if (result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index) {
      return;
    }

    const category = result.source.droppableId;
    console.log(category);
    // const newItemArray = Array.from(category);

    const quotes = reorder(
      state.quotes,
      result.source.index,
      result.destination.index
    );

    //dispatch call updateOptionPosition


    setState({ quotes });
  }

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        {
          Object.keys(props.optionPosition).map((category) => {
            const categoryIds = props.optionPosition[category]
            console.log(categoryIds);
            
            // this is the column
            return (
              <div key={category}>
                <h1>{category}</h1>
                <Droppable droppableId={category}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {props.optionPosition[category].map((optionId, index) => {
                        const option = props.options[optionId];
                        return (
                          <QuoteItem key={option.optionId}>
                            {option.optionName}
                          </QuoteItem>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })
        }
        {/* <h1>Category</h1>
        <Droppable droppableId="list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {Array.isArray(props.children) ?
                props.children.map((child: React.ReactElement, index: number) => {
                  return child;
                }) : props.children
              }
              {provided.placeholder}
            </div>
          )}
        </Droppable> */}
      </DragDropContext>

    </div>
  );
}


