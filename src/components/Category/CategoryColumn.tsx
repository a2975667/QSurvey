import { IQvOption } from "../../types/coreTypes";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { Container } from "../Category/Categories";
import DraggableItem from "../DraggableItem";

export interface CategoryColumnProps {
  category: string;
  options: { [key: string]: IQvOption };
  optionList: string[];
  totalCredits?: number;
  currCost?: number;
}

export const DraggableArea = () => {
  return (
    <div className="draggable-area grabbable">
      <div className="circle"></div>
      <div className="circle"></div>
      <div className="circle"></div>
    </div>
  );
};

export const CategoryColumn = (props: CategoryColumnProps) => {
  return (
    <Container>
      <h1>{props.category}</h1>
      <Droppable droppableId={props.category}>
        {provided => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {props.optionList.map((option, index) => (
              <DraggableItem key={props.options[option].optionId} option={props.options[option]} index={index} draggableId={props.options[option].optionId}/>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Container>
  )
};

