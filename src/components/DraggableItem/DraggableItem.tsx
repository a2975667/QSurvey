import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";

export interface DraggableItemProps {
  test: string;
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
    {props.test}
    <VoteSelection designType='Drop'></VoteSelection>
  </div>;
};
