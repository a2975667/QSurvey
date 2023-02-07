import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { Option } from '../../pages/test-page/TestPage'

export interface DraggableItemProps {
  option: Option;
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
  return <div className="item-wrapper">
    <DraggableArea></DraggableArea>
    {props.option.text} -----
    <VoteSelection option={props.option} designType='Drop' currVote={props.option.votes} ></VoteSelection>
  </div>;
};

