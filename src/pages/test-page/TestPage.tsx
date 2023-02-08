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
  questionID: string;
  optionID: string;
  text: string;
  description: string;
  position: number;
  group: string;
  votes: number;
}

const grid = 8;


export const TestPage = () => {
  const sampleSurvey = useSelector((state: RootState) => state);
  const sampleSurveyId = sampleSurvey.questions.allIds[0]
  const sampleQVOptionIDs = sampleSurvey.questions.byId[sampleSurveyId].qvOptions
  const options = sampleQVOptionIDs.map((optionId: string) => sampleSurvey.qvOptions.byId[optionId])
  const remainingCredit = sampleSurvey.questions.byId[sampleSurveyId].remainingCredit

  
  return <>
    <Category>
      {options.map((option: Option) => (
         <DraggableItem option={option} remainingCredit={remainingCredit} draggableId={option.optionID} index={option.position} key={option.optionID}/>
      ))}
    </Category>
  </>
}