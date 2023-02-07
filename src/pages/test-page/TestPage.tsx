// This page is for you to list your components and test its functionality like storybook

import { Draggable } from "react-beautiful-dnd";
import Category from "../../components/Category"
import DraggableItem from "../../components/DraggableItem"
import { useState, memo } from "react";
import styled from "@emotion/styled";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import internal from "stream";

export interface Option {
  optionID: string;
  text: string;
  description: string;
  position: number;
  group: string;
  votes: number;
}

const grid = 8;

function Quote({ option }: { option: Option; }) {
  return (
    <Draggable draggableId={option.optionID} index={option.position}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <DraggableItem option={option} />
        </div>
      )}
    </Draggable>
  );
}

export const TestPage = () => {
  const questions = useSelector((state: RootState) => state.sampleSurvey.questions);
  const options = questions[0].options;

  return <>
    <Category>
      {options.map((option) => (
        <Quote option={option} />
      ))}
    </Category>
  </>
}