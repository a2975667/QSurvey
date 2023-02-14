import {
  DragDropContext,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { useState } from "react";
import styled from "@emotion/styled";
import { IQvOption } from "../../types/coreTypes";
import DraggableItem from "../DraggableItem";
import { CategoryColumn } from "./CategoryColumn";
import { useDispatch } from "react-redux";
import { updateOptionPosition } from "../../features/qvOptionsSlice";

export const Container = styled.div`
  margin: 8px;
  border: 1px solid lightgrey;
  border-radius: 2px;
`;


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
  options: { [key: string]: IQvOption };
  optionPosition: { [key: string]: string[] };
  categories: string[];
}

export function Category(props: CategoryProps) {

  const dispatch = useDispatch();
  console.log(props);

  const [state, setState] = useState({ quotes: initial });

  function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    if (result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index) {
      return;
    }

    console.log(result);

    const category = result.source.droppableId;
    const newItemArray = Array.from(category);
    // get the source list of optionIds
    const sourceList = props.optionPosition[category];
    const sourceIndex = result.source.index;

    // get the source list of the new destination option list and index
    const destinationList = props.optionPosition[result.destination.droppableId];
    const destinationIndex = result.destination.index;

    console.log("S:", sourceList);
    console.log("D:", destinationList, destinationIndex);

    dispatch(updateOptionPosition({
      optionId: result.draggableId,
      originalCategory: category,
      newCategory: result.destination.droppableId,
      newPosition: destinationIndex,
    }))


    // const quotes = reorder(
    //   state.quotes,
    //   result.source.index,
    //   result.destination.index
    // );

    
    


    // setState({ quotes });
  }

  return (
      <DragDropContext onDragEnd={onDragEnd}>
        {props.categories.map((category) => {
            return <CategoryColumn key={category} category={category} options={props.options} optionList={props.optionPosition[category]}/>
        })}
      </DragDropContext>
  );


            {/* // this is the column
            return (
              <Container>
                <h1>{category}</h1>
                <Droppable droppableId={category}>
                  {(provided) => (
                    <div innerRef={provided.innerRef} {...provided.droppableProps}>
                      {props.optionPosition[category].map((option, index) => (
                        <DraggableItem key={option} option={props.options[option]} index={index} totalCredits={0} currCost={0} draggableId={category} />
                      ))}
                      {provided.placeholder}

                    </div>
                    // <div innerRef={provided.innerRef} {...provided.droppableProps}>
                    //   {props.optionPosition[category].map((optionId, index) => {
                    //     const option = props.options[optionId];
                    //     return (
                    //       <DraggableItem option={option} totalCredits={5} currCost={5} draggableId={category} index={index}/>
                    //       // <QuoteItem key={option.optionId}>
                    //       //   {option.optionName}
                    //       // </QuoteItem>
                    //     );
                    //   })}
                    //   {provided.placeholder}
                    // </div>
                  )}
                </Droppable>
              </Container>
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
  //     </DragDropContext>

  //   </div>
  // ); */}
}