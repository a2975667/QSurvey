import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { Option } from '../../pages/test-page/TestPage'
import { Draggable } from "react-beautiful-dnd";

export interface DraggableItemProps {
  option: Option;
  remainingCredit: number;
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
          {props.option.text} -----
          <VoteSelection designType='Drop' optionID={props.option.optionID} currVote={props.option.votes}
            remainingCredit={props.remainingCredit} questionID={props.option.questionID}/>
        </div>
      </div>
    )}
  </Draggable>;
};

