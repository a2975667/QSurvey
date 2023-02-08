import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { Option } from '../../pages/test-page/TestPage'

export interface DraggableItemProps {
  option: Option;
  remainingCredit: number;
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
  console.log(props.option)
  return <div className="item-wrapper">
    <DraggableArea></DraggableArea>
    {props.option.text} -----
    <VoteSelection designType='Drop' optionID={props.option.optionID} currVote={props.option.votes}
      remainingCredit={props.remainingCredit} questionID={props.option.questionID}>
    </VoteSelection>
  </div>;
};