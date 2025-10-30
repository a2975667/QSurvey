import { IQsOption } from "../../types/coreTypes";
import { Droppable } from "react-beautiful-dnd";
import { Container } from "../Category/Categories";
import DraggableItem from "../DraggableItem";
import { CustomButton } from '../Button/Button';
import { useDispatch } from "react-redux";
import { regroupAndOrderOptions, reorderOptions } from '../../features/qsOptionsSlice';
import "./Category.css";
import { useState } from "react";

export interface CategoryColumnProps {
  category: string;
  categories?: string[];
  options: { [key: string]: IQsOption };
  optionList: string[];
  totalCredits?: number;
  currCost?: number;
  view: string;
  style?: string;
  inputType?: "wheel" | "dropdown";
  onClick?: () => void;
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
  const optionIds = props.optionList || [];

  const handleMouseEnter = () => {
    setIsHovering(true);
  }

  const handleMouseLeave = () => {
    setIsHovering(false);
  }

  // Is this column droppable? We disable dropabble if:
  // 1. this column belongs to "Undecided" inside the "organize" view.
  const disableDroppable = (props.view === "organize" && props.category === "Undecided");
  const reorderCategoryOptions = (category: string) => {
    dispatch(reorderOptions({curCategory : category}));
  };

  // we disableDroppable if this column belongs to "Undecided" inside the "organize" view. This is a toggle.
  // const disableDroppable =
  //   props.view === "organize" && props.category === "Undecided";
  // console.log("current props.optionList.length: ", props.optionList.length)
  // console.log("props.view === organize: ", props.view === "organize")
  // console.log("props.category === Skip: ", props.category)
  // console.log("props.view === organize and props.category === Skip and props.optionList.length > 0: ", props.view === "organize" && props.category === "Skip" && props.optionList.length > 0)
  return (
    <div
      className={`category-container-parent ${props.view} ${props.category}`}
      onClick={props.onClick}
    >
      {/* All Views */}

      {props.view === "organize" && props.category !== "Undecided" && props.category !== "Skip" && (
        <h2 className={props.category}>Lean {props.category}</h2>
      )}


      {/* {props.category === "Skip" && <h2 className="Skip">Skipped Options</h2>} */}

      {/* Organize View */}
      {props.view === "organize" && props.category === "Undecided" && (
        <h2 className="rating-panel">
          {optionIds.length === 0
            ? "No more options to rate"
            : optionIds.length > 1
            ? `There are ${
                optionIds.length - 1
              } more options, rating the next option:`
            : "Last option to rate:"}
        </h2>
      )}

      {props.view === "organize" &&
        props.category === "Skip" &&
        optionIds.length > 0 && (
          <div className="skipped-container">
            <h2 className="skipped-panel">
              {`You skipped ${optionIds.length} options`}
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
      {props.view === "vote" && props.category !== "Undecided" && props.category !== "Skip" && (
        <div className={`viewCategoryTitle viewCategoryTitle-${props.category}`}>
          <h2 className="viewCategoryTitle-title">Lean {props.category}</h2>
          <CustomButton className={`reorder reorder-${props.category}`} label="Sort by Votes" onClick={() => reorderCategoryOptions(props.category)}>
            {/* <span className="tooltip">Reorder Lean {props.category} options based on your current vote.</span> */}
          </CustomButton>          
        </div>
      )}
      {props.view === "vote" && props.category === "Skip" && (
        <div className="viewCategoryTitle viewCategoryTitle-undecided">
          <h2 className="viewCategoryTitle-title">Skipped or Undecided</h2>
        </div>
      )}

      {/* If this is a vote view in the text condition */}
      {props.style === "text" && (
        <h2 className="Undecided">All Options</h2>
      )}

      <div
        className={`categoryContainer ${props.view} ${props.category} ${
          optionIds.length > 8 ? "scroll" : ""
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
                optionIds
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
                  <div className="skip-items-grid">
                    {optionIds.map((option, index) => (
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
                  </div>
                )}

              {((props.category !== "Undecided" && props.category !== "Skip") ||
                props.view === "vote") &&
                optionIds.map((option, index) => (
                  <DraggableItem
                    style={props.style}
                    key={props.options[option].optionId}
                    index={index}
                    draggableId={props.options[option].optionId}
                    option={props.options[option]}
                    view={props.view}
                    totalCredits={props.totalCredits}
                    currCost={props.currCost}
                    categories={props.categories}
                    isUndecided={props.category === "Undecided"}
                    // inputType={props.inputType}
                  />
                ))}

              {props.category !== "Undecided" &&
                props.category !== "Skip" &&
                props.view === "organize" &&
                optionIds.length === 0 && 
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
