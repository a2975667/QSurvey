import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { IQsOption } from "../../types/coreTypes";
import { Draggable } from "react-beautiful-dnd";
import { CategoryController } from "../Category/CategoryController";
import { useState, useRef } from "react";
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../app/store';
import { hoverStart, hoverEnd } from '../../telemetry/actions';

export interface DraggableItemProps {
  questionId: string;
  option: IQsOption;
  totalCredits?: number;
  currCost?: number;
  draggableId: string;
  index: number;
  view: string;
  isUndecided?: boolean;
  categories?: string[];
  style?: string;
  onUpdateGroup?: (optionId: string, newGroup: string) => void;
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

export const DraggableItem: React.FC<DraggableItemProps> = (props) => {
  const [isHovered, setIsHovered] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = () => {
    if (props.view === "vote") {
      setIsHovered(true);
      try {
        dispatch(hoverStart({ questionId: props.questionId, optionId: props.option.optionId, group: props.option.group, index: props.index }) as any);
      } catch {}
    }
  };

  const handleMouseLeave = () => {
    if (props.view === "vote") {
      setIsHovered(false);
      try {
        dispatch(hoverEnd({ questionId: props.questionId, optionId: props.option.optionId, group: props.option.group, index: props.index }) as any);
      } catch {}
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
            ref={(el) => {
              rootRef.current = el as HTMLDivElement | null;
              (provided.innerRef as any)(el);
            }}
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
                  {isHovered && (
                    <div className={`organizer-info ${props.option.group}`}>
                      <div className="organizer-info-title">
                        {props.option.optionName}
                      </div>
                      <div className="organizer-info-des">
                        {props.option.description}
                      </div>
                    </div>
                  )}
                  {!isHovered && (
                    <div className={`organizer-info ${props.option.group}`}>
                      <div className="organizer-info-title">
                        {props.option.optionName}
                      </div>
                      <div className="organizer-info-des-light">
                        {props.option.description}
                      </div>
                    </div>
                  )}

                  {isHovered && (
                    <VoteSelection
                      designType="Drop"
                      questionId={props.questionId}
                      optionId={props.option.optionId}
                      currVote={props.option.votes}
                      totalCredits={props.totalCredits!}
                      currCost={props.currCost!}
                      onSelectionComplete={() => setIsHovered(false)}
                    />
                  )}
                  {!isHovered && (
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
                      questionId={props.questionId}
                      optionId={props.option.optionId}
                      currentGroup={props.option.group}
                      categories={props.categories!}
                      onUpdateGroup={props.onUpdateGroup}
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
  
