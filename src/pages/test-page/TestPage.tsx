// This page is for you to list your components and test its functionality like storybook

import { Draggable } from "react-beautiful-dnd";
import Category from "../../components/Category"
import DraggableItem from "../../components/DraggableItem"
import { useAppSelector } from "../../app/hooks";
import { IQvOption } from "../../types/coreTypes";

const grid = 8;

function Quote({ option, totalCredits }: { option: IQvOption; totalCredits: number }) {
  return (
    <Draggable draggableId={option.optionId} index={option.position}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <DraggableItem option={option} totalCredits={totalCredits} />
        </div>
      )}
    </Draggable>
  );
}

export const TestPage = () => {
  const survey = useAppSelector((state) => state);
  const question = Object.values(survey.questions.byId).find(obj => obj.position === 0)!;
  const options = question.options!.map((optionId) => survey.qvOptions.byId[optionId])
  const totalCredits = question.totalCredits



  return <>
    <h1>Test Page</h1>
    <Category>
      {options.map((option: IQvOption) => (
        <Quote option={option} totalCredits={totalCredits}/>
      ))}
    </Category>
  </>
}