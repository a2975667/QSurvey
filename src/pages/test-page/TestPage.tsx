// This page is for you to list your components and test its functionality like storybook

import { Draggable } from "react-beautiful-dnd";
import Category from "../../components/Category"
import DraggableItem from "../../components/DraggableItem"
import { useAppSelector } from "../../app/hooks";
import { IQvOption } from "../../types/coreTypes";
import { useEffect, useState } from "react";
import Summary from "../../components/Summary";


export const TestPage = () => {
  const survey = useAppSelector((state) => state);
  const question = Object.values(survey.questions.byId).find(obj => obj.position === 0)!;
  
  const options = Object.values(question.options!).reduce((acc, optionId) => {
    acc[optionId] = survey.qvOptions.byId[optionId];
    return acc;
  }, {} as { [key: string]: IQvOption });
  
  const totalCredits = question.totalCredits

  const [currCost, setCurrCost] = useState(0);

  useEffect(() => {
    setCurrCost(Object.values(options).reduce((acc, option) => acc + Math.pow(option.votes, 2), 0));
  }, [options]);

  return <>
    <h1>Test Page: Current Credit {currCost}, Total Credit {totalCredits}</h1>
    <Category>
      {Object.values(options).map((option: IQvOption) => (
         <DraggableItem option={option} totalCredits={totalCredits} currCost={currCost} draggableId={option.optionId} index={option.position} key={option.optionId}/>
      ))}
    </Category>

    <Summary totalCredits={totalCredits} currCost={currCost} optionList={options} />
  </>
}