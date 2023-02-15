import { IQvOption } from "../../types/coreTypes";
import { Droppable } from "react-beautiful-dnd";
import { Container } from "../Category/Categories";
import DraggableItem from "../DraggableItem";
import './Category.css'

export interface CategoryColumnProps {
  category: string;
  categories?: string[];
  options: { [key: string]: IQvOption };
  optionList: string[];
  totalCredits?: number;
  currCost?: number;
  view: string;
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
    <div className={`category-container-parent ${props.view} ${props.category}`}>
      {props.category !== "Undecided" && (
        <h2 className={props.category}>Lean {props.category}</h2>
      )}

      {props.category === "Undecided" && (
        <h2 className="rating-panel">Rate the next Option</h2>
      )}
      <div className={`categoryContainer ${props.view} ${props.category}`}>
      <Droppable droppableId={props.category}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={`${snapshot.isDraggingOver}IsDraggingOver`}>
            {props.optionList.map((option, index) => (
              <DraggableItem
                key={props.options[option].optionId}
                index={index}
                draggableId={props.options[option].optionId}
                option={props.options[option]}
                view={props.view}
                totalCredits={props.totalCredits}
                currCost={props.currCost}
                categories={props.categories}
                isUndecided={props.category === "Undecided"}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      </div>
      
    </div>
  );
};
