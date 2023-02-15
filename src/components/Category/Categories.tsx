import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { useState } from "react";
import styled from "@emotion/styled";
import { IQvOption } from "../../types/coreTypes";
import DraggableItem from "../DraggableItem";
import { CategoryColumn } from "./CategoryColumn";
import { useDispatch } from "react-redux";
import { updateOptionPosition } from "../../features/qvOptionsSlice";
import './Category.css'

const grid = 8;

export const Container = styled.div`
  margin: 8px;
  border: 1px solid lightgrey;
  border-radius: 2px;
`;

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
  view: string;
  totalCredits?: number;
  currCost?: number;
}

export function Category(props: CategoryProps) {
  const dispatch = useDispatch();
  function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    if (
      result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index
    ) {
      return;
    }

    const category = result.source.droppableId;
    const newItemArray = Array.from(category);
    // get the source list of optionIds
    const sourceList = props.optionPosition[category];
    const sourceIndex = result.source.index;

    // get the source list of the new destination option list and index
    const destinationList =
      props.optionPosition[result.destination.droppableId];
    const destinationIndex = result.destination.index;

    dispatch(
      updateOptionPosition({
        optionId: result.draggableId,
        originalCategory: category,
        newCategory: result.destination.droppableId,
        newPosition: destinationIndex,
      })
    );
  }

  return (
    <div className={`categoryCanvas ${props.view}`}>
      <DragDropContext onDragEnd={onDragEnd}>
      {props.categories.map((category) => {
        return (
          <CategoryColumn
            key={category}
            categories={props.categories}
            category={category}
            options={props.options}
            optionList={props.optionPosition[category]}
            view={props.view}
            totalCredits={props.totalCredits}
            currCost={props.currCost}
          />
        );
      })}
    </DragDropContext>
    </div>
    
  );
}
