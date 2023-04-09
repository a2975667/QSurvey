import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { useState } from "react";
import styled from "@emotion/styled";
import { IQvOption } from "../../types/coreTypes";
import { CustomButton } from '../Button/Button';
import DraggableItem from "../DraggableItem";
import { CategoryColumn } from "./CategoryColumn";
import { useDispatch } from "react-redux";
import { updateOptionPosition } from "../../features/qvOptionsSlice";
import { regroupAndOrderOptions } from '../../features/qvOptionsSlice';
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

  const onDragStart = (): void => {
    const element = document.querySelector('.isDragging[true]') as HTMLElement;
    if (element) {
      element.style.width = '30%';
    }
  };

  const reorderCategoryOptions = (category: string) => {
    dispatch(regroupAndOrderOptions({curCategory : category}));
  };


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

    console.log(
      {optionId: result.draggableId,
      originalCategory: category,
      newCategory: result.destination.droppableId,
      newPosition: destinationIndex,}
    )

    dispatch(
      updateOptionPosition({
        optionId: result.draggableId,
        originalCategory: category,
        newCategory: result.destination.droppableId,
        newPosition: destinationIndex,
      })
    );
  }

  // Debug Toggle order of organize categories
  let populateSequence = props.categories;
  if (props.view === "organize") {
    // in the organize view, we need to show elements in the "Undecided" initial category
    populateSequence = ["Undecided"].concat(props.categories);
  } else {
    // move the first element to the end and store it in populateSequence
    populateSequence = props.categories.slice(1).concat(props.categories.slice(0, 1));
  }

  return (
    <div className={`categoryCanvas ${props.view}`}>
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
      {populateSequence.map((category) => {
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
