import { IQvOption } from "../../types/coreTypes";
import { Droppable } from "react-beautiful-dnd";
import { Container } from "../Category/Categories";
import DraggableItem from "../DraggableItem";
import { CustomButton } from '../Button/Button';
import { useDispatch } from "react-redux";
import { regroupAndOrderOptions, reorderOptions } from '../../features/qvOptionsSlice';
import "./Category.css";
import { useState } from "react";

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
  const [isHovering, setIsHovering] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dispatch = useDispatch();

  const handleMouseEnter = () => {
    setIsHovering(true);
  }

  const handleMouseLeave = () => {
    setIsHovering(false);
  }

  const reorderCategoryOptions = (category: string) => {
    dispatch(reorderOptions({curCategory : category}));
  };

  // we disableDroppable if this column belongs to "Undecided" inside the "organize" view. This is a toggle.
  const disableDroppable =
    props.view === "organize" && props.category === "Undecided";

  return (
    <div
      className={`category-container-parent ${props.view} ${props.category}`}
    >
      {/* All Views */}

      {props.view === "organize" && props.category !== "Undecided" && props.category !== "Skip" && (
        <h2 className={props.category}>Lean {props.category}</h2>
      )}


      {/* {props.category === "Skip" && <h2 className="Skip">Skipped Options</h2>} */}

      {/* Organize View */}
      {props.view === "organize" && props.category === "Undecided" && (
        <h2 className="rating-panel">
          {props.optionList.length === 0
            ? "No more options to rate"
            : props.optionList.length > 1
            ? `There are ${
                props.optionList.length - 1
              } more options, rating the next option:`
            : "Last option to rate:"}
        </h2>
      )}

      {props.view === "organize" &&
        props.category === "Skip" &&
        props.optionList.length > 0 && (
          <div className="skipped-container">
            <h2 className="skipped-panel">
              {`You skipped ${props.optionList.length} options`}
            </h2>
            {!showMore && (
              <h2
                className="skipped-panel show-more"
                onClick={() => setShowMore(true)}
              >
                Show Skipped Options
              </h2>
            )}
            {showMore && (
              <h2
                className="skipped-panel show-compact"
                onClick={() => setShowMore(false)}
              >
                Hide Skipped Options
              </h2>
            )}
          </div>
        )}

      {/* Vote View */}
      {props.view === "vote" && props.category === "Positive" && (
        <div className="viewCategoryTitle-positive">
          <h2 className="title">Lean Positive Options</h2>
          <CustomButton className={"reorder"} label="Reorder" onClick={() => reorderCategoryOptions(props.category)} />
        </div>
      )}
      {props.view === "vote" && props.category === "Neutral" && (
        <div className="viewCategoryTitle-neutral">
          <h2 className="title">Lean Neutral Options</h2>
          <CustomButton className={"reorder"} label="Reorder" onClick={() => reorderCategoryOptions(props.category)} />
        </div>
      )}
      {props.view === "vote" && props.category === "Negative" && (
        <div className="viewCategoryTitle-negative">
          <h2 className="title">Lean Negative Options</h2>
          <CustomButton className={"reorder"} label="Reorder" onClick={() => reorderCategoryOptions(props.category)} />
        </div>
      )}
      {props.view === "vote" && props.category === "Skip" && (
        <div className="viewCategoryTitle-undecided">
          <h2 className="title">Skipped or Undecided Options</h2>
          <CustomButton className={"reorder"} label="Reorder" onClick={() => reorderCategoryOptions(props.category)} />
        </div>
      )}

      <div
        className={`categoryContainer ${props.view} ${props.category} ${
          props.optionList.length > 8 ? "scroll" : ""
        }`}
        onMouseEnter = {handleMouseEnter}
        onMouseLeave = {handleMouseLeave}
      >
        <Droppable
          droppableId={props.category}
          isDropDisabled={disableDroppable}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`${snapshot.isDraggingOver}IsDraggingOver`}
            >
              {props.view === "organize" &&
                props.category === "Undecided" &&
                props.optionList
                  .filter((_, index) => showMore || index < 1)
                  .map((option, index) => (
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

              {props.view === "organize" &&
                props.category === "Skip" &&
                showMore && (
                  <>
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
                  </>
                )}

              {((props.category !== "Undecided" && props.category !== "Skip") ||
                props.view === "vote") &&
                props.optionList.map((option, index) => (
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

              {props.category !== "Undecided" &&
                props.category !== "Skip" &&
                props.view === "organize" &&
                props.optionList.length === 0 && 
                isHovering && (
                  <div className={"no-option-placeholder"}>
                    <p>
                      No options in this group.
                      <br /> Rate your next option.
                    </p>
                  </div>
                )}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};
