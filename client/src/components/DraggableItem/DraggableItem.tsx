import VoteSelection from "../VoteSelection";
import "./DraggableItem.css";
import { IQsOption } from "../../types/coreTypes";
import { Draggable, DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { CategoryController } from "../Category/CategoryController";
import { useEffect, useState, useRef } from "react";
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../app/store';
import { hoverStart, hoverEnd } from '../../telemetry/actions';
import { formatQvVote, resolveQvLabels, ResolvedQvLabels } from '../../i18n/qvLabels';

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
  qvLabels?: ResolvedQvLabels;
  restrictVoteByCategory?: boolean;
  markOverBudgetVotes?: boolean;
}

// When restrictVoteByCategory is on, map an option's group to the sign of votes
// it may receive: "Positive" → no-vote + upvotes, "Negative" → no-vote +
// downvotes, anything else (Neutral/Undecided/Skip) → full range.
const resolveAllowedVoteSign = (
  group: string,
  restrict: boolean,
): "positive" | "negative" | null => {
  if (!restrict) return null;
  const g = (group || "").toLowerCase();
  if (g === "positive") return "positive";
  if (g === "negative") return "negative";
  return null;
};

export const DraggableArea = ({
  dragHandleProps,
}: {
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) => {
  return (
    <div className="draggable-area grabbable" {...dragHandleProps}>
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
  const labels = props.qvLabels || resolveQvLabels();
  const [isHovered, setIsHovered] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = () => {
    const canHover =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover)").matches;
    if (props.view === "vote" && canHover) {
      setIsHovered(true);
      try {
        dispatch(hoverStart({ questionId: props.questionId, optionId: props.option.optionId, group: props.option.group, index: props.index }) as any);
      } catch {}
    }
  };

  const handleMouseLeave = () => {
    const canHover =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover)").matches;
    if (props.view === "vote" && canHover) {
      setIsHovered(false);
      try {
        dispatch(hoverEnd({ questionId: props.questionId, optionId: props.option.optionId, group: props.option.group, index: props.index }) as any);
      } catch {}
    }
  };

  const handleVoteCurrentTouchStart = () => {
    if (props.view !== "vote") return;
    setIsHovered(true);
  };

  useEffect(() => {
    if (!isHovered) return;
    const eventName =
      typeof window !== "undefined" && "PointerEvent" in window
        ? "pointerdown"
        : "mousedown";
    const handleOutside = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const isInsideCard = rootRef.current?.contains(target);
      const isInsideSelect =
        target.closest(".select-dropdown-container") ||
        target.closest(".select__control") ||
        target.closest(".select__menu");
      if (!isInsideCard && !isInsideSelect) {
        setIsHovered(false);
      }
    };
    document.addEventListener(eventName, handleOutside, true);
    return () => {
      document.removeEventListener(eventName, handleOutside, true);
    };
  }, [isHovered]);
  
    return (
      <Draggable
        draggableId={props.draggableId}
        index={props.index}
        isDragDisabled={
          (props.view === "organize" && props.isUndecided === true) ||
          props.style === "text"
        }
      >
        {(provided, snapshot) => {
          const isVoteView = props.view === "vote";
          const dragHandleProps = provided.dragHandleProps ?? undefined;
          const rootDragHandleProps = isVoteView ? undefined : dragHandleProps;
          const voteDragHandleProps = isVoteView ? dragHandleProps : undefined;

          return (
          <div
            {...provided.draggableProps}
            {...rootDragHandleProps}
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
                <DraggableArea dragHandleProps={voteDragHandleProps}></DraggableArea>
              )}
  
              {/* has {props.option.votes} votes. Change votes? */}
              {props.view === "vote" && (
                <div className={`optionCard ${props.option.group}`}>
                  {isHovered && (
                    <div
                      className={`organizer-info ${props.option.group}`}
                      {...voteDragHandleProps}
                    >
                      <div className="organizer-info-title">
                        {props.option.optionName}
                      </div>
                      <div className="organizer-info-des">
                        {props.option.description}
                      </div>
                    </div>
                  )}
                  {!isHovered && (
                    <div
                      className={`organizer-info ${props.option.group}`}
                      {...voteDragHandleProps}
                    >
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
                      onMenuClose={() => setIsHovered(false)}
                      onSelectionComplete={() => {
                        setIsHovered(false);
                      }}
                      qvLabels={labels}
                      allowedVoteSign={resolveAllowedVoteSign(
                        props.option.group,
                        props.restrictVoteByCategory ?? false,
                      )}
                      markOverBudgetVotes={props.markOverBudgetVotes}
                    />
                  )}
                  {!isHovered && (
                    <div
                      className="vote-current-state"
                      onTouchStart={handleVoteCurrentTouchStart}
                    >
                      {/* <div className="vote-current-state vote">
                        {props.option.votes > 0
                          ? `+${props.option.votes}`
                          : props.option.votes}{" "}
                        rating
                      </div> */}
                      <div className="vote-current-state vote">
                        {formatQvVote(props.option.votes, labels.aliases)}
                      </div>
                      <div className="vote-current-state cost">
                        ${props.option.votes * props.option.votes}
                      </div>
                      <span className="vote-dropdown-indicator" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 20 20" focusable="false">
                          <path
                            d="M5 7l5 5 5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
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
                      qvLabels={labels}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          );
        }}
      </Draggable>
    );
  };
  
