import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { IQvOption } from "../../types/coreTypes";
import { Draggable } from "react-beautiful-dnd";
import { CategoryController } from "../Category/CategoryController";

export interface DraggableItemProps {
  option: IQvOption;
  totalCredits?: number;
  currCost?: number;
  draggableId: string;
  index: number;
  view: string;
  isUndecided?: boolean;
  categories?: string[];
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

// DraggableItem controls how each option card looks like
// There are currently three views -- categorizing, resetting category and voting
// the first two is deteremined by the isUndecided prop
// the last one is determined by the view prop

export const DraggableItem = (props: DraggableItemProps) => {
  return (
    <Draggable draggableId={props.draggableId} index={props.index}>
      {(provided, snapshot) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <div className={`item-wrapper ${props.view} ${props.option.group}  isDragging${snapshot.isDragging}`}>
            <DraggableArea></DraggableArea>

            {/* has {props.option.votes} votes. Change votes? */}
            {props.view === "vote" && (
              <div>
                <h3>{props.option.optionName}</h3>
                <VoteSelection
                  designType="Drop"
                  optionId={props.option.optionId}
                  currVote={props.option.votes}
                  totalCredits={props.totalCredits!}
                  currCost={props.currCost!}
                />
              </div>
            )}
            {props.view === "organize" && (
              <div className={`optionCard ${props.option.group}`} >
                <div className={`organizer-info ${props.option.group}`}>
                  <div className="organizer-info-title">{props.option.optionName}</div>
                  {props.option.group === "Undecided" && !snapshot.isDragging && (
                    <div className="organizer-info-des">{props.option.description}</div>
                  )}

                </div>
                {!snapshot.isDragging && (
                  <CategoryController
                    optionId={props.option.optionId}
                    currCategory={props.option.group}
                    categories={props.categories!}
                  />
                )}


              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
