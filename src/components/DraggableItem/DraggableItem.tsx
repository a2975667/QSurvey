import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { IQvOption } from "../../types/coreTypes";
import { Draggable } from "react-beautiful-dnd";
import { CategoryController } from "../Category/CategoryController";
import { useState } from "react";

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
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false); // debug control
  };

  return (
    <Draggable draggableId={props.draggableId} index={props.index} isDragDisabled={props.view==="organize" && props.isUndecided===true}>
      {(provided, snapshot) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className={`item-wrapper ${props.view} ${props.option.group}  isDragging${snapshot.isDragging}`}>
            {(props.view === "vote" || (props.view === "organize" && !props.isUndecided)) && (
              <DraggableArea></DraggableArea>
            )}

            {/* has {props.option.votes} votes. Change votes? */}
            {props.view === "vote" && (
              <div className={`optionCard ${props.option.group}`} >
                {isHovering && (
                  <div className={`organizer-info ${props.option.group}`}>
                    <div className="organizer-info-title">{props.option.optionName}</div>
                    <div className="organizer-info-des">{props.option.description}</div>
                  </div>
                )}
                {!isHovering && (
                  <div className={`organizer-info ${props.option.group}`}>
                    <div className="organizer-info-title">{props.option.optionName}</div>
                    <div className="organizer-info-des-light">{props.option.description}</div>
                  </div>
                )}

                {isHovering && (
                  <VoteSelection
                    designType="Wheel"
                    optionId={props.option.optionId}
                    currVote={props.option.votes}
                    totalCredits={props.totalCredits!}
                    currCost={props.currCost!}
                  />
                )}
                {!isHovering && (
                  <div className="vote-current-state">
                    <div className="vote-current-state vote">
                      {props.option.votes > 0 ? `+${props.option.votes}` : props.option.votes} rating
                    </div>
                    <div className="vote-current-state cost">${props.option.votes * props.option.votes}</div>
                  </div>

                )}

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
