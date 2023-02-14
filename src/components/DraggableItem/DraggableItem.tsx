import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { IQvOption } from "../../types/coreTypes";
import { Draggable } from "react-beautiful-dnd";

export interface DraggableItemProps {
  option: IQvOption;
  totalCredits: number;
  currCost: number;
  draggableId: string;
  index: number;
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

export const DraggableItem = (props: DraggableItemProps) => {
  return  <Draggable draggableId={props.draggableId} index={props.index}>
    {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
        <div className="item-wrapper">
          <DraggableArea></DraggableArea>
          <h3>{props.option.optionName}</h3> has {props.option.votes} votes. Change votes?
          <VoteSelection designType='Wheel' optionId={props.option.optionId}
            currVote={props.option.votes} totalCredits={props.totalCredits}
            currCost={props.currCost}/>
        </div>
      </div>
      )}
  </Draggable>;
};

