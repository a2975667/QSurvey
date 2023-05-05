import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { IQvOption } from "../../types/coreTypes";
import { Draggable } from "react-beautiful-dnd";
import { CategoryController } from "../Category/CategoryController";
import { Dispatch, SetStateAction, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearOnHoverOptionID, setOnHoverOptionID } from "../../features/qvOptionsSlice";
import { RootState } from "../../app/store";

export interface DraggableItemProps {
  option: IQvOption;
  totalCredits?: number;
  currCost?: number;
  draggableId: string;
  index: number;
  view: string;
  isUndecided?: boolean;
  categories?: string[];
  style?: string;
}

export const DraggableArea = () => {
  return (
    <div className="draggable-area grabbable">
      <div className="draggable-column-1 grabbable">
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
      <div className="draggable-column-2 grabbable">
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
    </div>
  );
};

// DraggableItem controls how each option card looks like
// There are currently three views -- categorizing, resetting category and voting
// the first two is deteremined by the isUndecided prop
// the last one is determined by the view prop

export const DraggableItem: React.FC<DraggableItemProps> = (props) => {
//export const DraggableItem = (props: DraggableItemProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const dispatch = useDispatch();

  // this should be passed down as a prop instead of calling useSelector here. A metadata should be maintained throughout the component tree.
  const currentlyHoveredOptionId = useSelector((state: RootState) => state.qvOptions.metadata.onHoverOptionId);

  const handleMouseEnter = () => {
    // setIsHovering(true);
    if (props.view === "vote"){
      dispatch(setOnHoverOptionID(props.option.optionId))
    }
  };

  const handleMouseLeave = () => {
    // setIsHovering(false); // debug control
    if (props.view === "vote"){
      dispatch(clearOnHoverOptionID())
    }
  };

  return (
    <Draggable
      draggableId={props.draggableId}
      index={props.index}
      isDragDisabled={
        (props.view === "organize" && props.isUndecided === true) ||
        props.style === "text"
      }
    >
      {(provided, snapshot) => (
        <div
          {...provided.draggableProps}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`item-wrapper ${props.view} ${props.option.group}  isDragging${snapshot.isDragging}`}
          >
            {((props.view === "vote" && props.style !== "text") || 
              (props.view === "organize" && !props.isUndecided)) && (
              <DraggableArea></DraggableArea>
            )}

            {/* has {props.option.votes} votes. Change votes? */}
            {props.view === "vote" && (
              <div className={`optionCard ${props.option.group}`}>
                {currentlyHoveredOptionId === props.option.optionId && (
                  <div className={`organizer-info ${props.option.group}`}>
                    <div className="organizer-info-title">
                      {props.option.optionName}
                    </div>
                    <div className="organizer-info-des">
                      {props.option.description}
                    </div>
                  </div>
                )}
                {!(currentlyHoveredOptionId === props.option.optionId) && (
                  <div className={`organizer-info ${props.option.group}`}>
                    <div className="organizer-info-title">
                      {props.option.optionName}
                    </div>
                    <div className="organizer-info-des-light">
                      {props.option.description}
                    </div>
                  </div>
                )}

                {currentlyHoveredOptionId === props.option.optionId && (
                  <VoteSelection
                    designType="Drop"
                    optionId={props.option.optionId}
                    currVote={props.option.votes}
                    totalCredits={props.totalCredits!}
                    currCost={props.currCost!}
                    onSelectionComplete={() => setIsHovering(false)}
                  />
                )}
                {!(currentlyHoveredOptionId === props.option.optionId) && (
                  <div className="vote-current-state">
                    {/* <div className="vote-current-state vote">
                      {props.option.votes > 0
                        ? `+${props.option.votes}`
                        : props.option.votes}{" "}
                      rating
                    </div> */}
                    <div className="vote-current-state vote">
                      {props.option.votes > 0
                        ? `${props.option.votes} ${
                            props.option.votes === 1 ? "upvote" : "upvotes"
                          }`
                        : props.option.votes < 0
                        ? `${-props.option.votes} ${
                            -props.option.votes === 1 ? "downvote" : "downvotes"
                          }`
                        : "No votes"}
                    </div>
                    <div className="vote-current-state cost">
                      ${props.option.votes * props.option.votes}
                    </div>
                  </div>
                )}
              </div>
            )}
            {props.view === "organize" && (
              <div className={`optionCard ${props.option.group}`}>
                <div className={`organizer-info ${props.option.group}`}>
                  <div className="organizer-info-title">
                    {props.option.optionName}
                  </div>
                  {props.option.group === "Undecided" &&
                    !snapshot.isDragging && (
                      <div className="organizer-info-des">
                        {props.option.description}
                      </div>
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
