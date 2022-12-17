import "./DraggableItem.css";
export const DraggableArea = () => {
  return (
    <div className="draggable-area grabbable">
      <div className="circle"></div>
      <div className="circle"></div>
      <div className="circle"></div>
    </div>
  );
};

export const DraggableItem = () => {
  return <div className="item-wrapper">
    <DraggableArea></DraggableArea>
  </div>;
};
