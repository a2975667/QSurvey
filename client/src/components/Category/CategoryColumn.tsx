import { IQsOption } from "../../types/coreTypes";
import { Droppable } from "@hello-pangea/dnd";
import DraggableItem from "../DraggableItem";
import { CustomButton } from '../Button/Button';
import "./Category.css";
import { useState } from "react";
import {
  getQvBinLabel,
  resolveQvLabels,
  ResolvedQvLabels,
} from "../../i18n/qvLabels";

export interface CategoryColumnProps {
  questionId: string;
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
  onReorderCategory?: (category: string) => void;
  onUpdateGroup?: (optionId: string, newGroup: string) => void;
  qvLabels?: ResolvedQvLabels;
  restrictVoteByCategory?: boolean;
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
  const labels = props.qvLabels || resolveQvLabels();
  const [isHovering, setIsHovering] = useState(false);
  const [showMore, setShowMore] = useState(false);

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
  const isEmptyMainOrganizeBin =
    props.view === "organize" &&
    props.category !== "Undecided" &&
    props.category !== "Skip" &&
    optionIds.length === 0 &&
    !disableDroppable;
  const reorderCategoryOptions = (category: string) => {
    props.onReorderCategory?.(category);
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
        <h2 className={props.category}>{labels.aliases.leanPrefix} {getQvBinLabel(props.category, labels.aliases)}</h2>
      )}


      {/* {props.category === "Skip" && <h2 className="Skip">Skipped Options</h2>} */}

      {/* Organize View */}
      {props.view === "organize" && props.category === "Undecided" && (
        <h2 className="rating-panel">
          {optionIds.length === 0
            ? labels.text.noMoreOptionsToRate
            : optionIds.length > 1
            ? labels.text.moreOptionsToRate(optionIds.length - 1)
            : labels.text.lastOptionToRate}
        </h2>
      )}

      {props.view === "organize" &&
        props.category === "Skip" &&
        optionIds.length > 0 && (
          <div className="skipped-container">
            <h2 className="skipped-panel">
              {labels.text.skippedOptionsCount(optionIds.length)}
            </h2>
            {!showMore && (
              <h2
                className="skipped-panel show-more"
                onClick={() => setShowMore(true)}
              >
                {labels.text.showSkippedOptions}
              </h2>
            )}
            {showMore && (
              <h2
                className="skipped-panel show-compact"
                onClick={() => setShowMore(false)}
              >
                {labels.text.hideSkippedOptions}
              </h2>
            )}
          </div>
        )}

      {/* Vote View */}
      {props.view === "vote" && props.category !== "Undecided" && props.category !== "Skip" && (
        <div className={`viewCategoryTitle viewCategoryTitle-${props.category}`}>
          <h2 className="viewCategoryTitle-title">{labels.aliases.leanPrefix} {getQvBinLabel(props.category, labels.aliases)}</h2>
          <CustomButton className={`reorder reorder-${props.category}`} label={labels.aliases.sortByVotes} onClick={() => reorderCategoryOptions(props.category)}>
            {/* <span className="tooltip">Reorder Lean {props.category} options based on your current vote.</span> */}
          </CustomButton>          
        </div>
      )}
      {props.view === "vote" && props.category === "Skip" && (
        <div className="viewCategoryTitle viewCategoryTitle-undecided">
          <h2 className="viewCategoryTitle-title">{labels.text.skippedOrUndecided}</h2>
        </div>
      )}

      {/* If this is a vote view in the text condition */}
      {props.style === "text" && (
        <h2 className="Undecided">{labels.text.allOptions}</h2>
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
              className={`category-droppable ${snapshot.isDraggingOver}IsDraggingOver ${
                isEmptyMainOrganizeBin ? "empty-main-organize-bin" : ""
              }`}
              data-testid={`category-droppable-${props.category}`}
            >
              {props.view === "organize" &&
                props.category === "Undecided" &&
                optionIds
                  .filter((_, index) => showMore || index < 1)
                  .map((option, index) => (
                    <DraggableItem
                      questionId={props.questionId}
                      onUpdateGroup={props.onUpdateGroup}
                      key={props.options[option].optionId}
                      index={index}
                      draggableId={props.options[option].optionId}
                      option={props.options[option]}
                      view={props.view}
                      totalCredits={props.totalCredits}
                      currCost={props.currCost}
                      categories={props.categories}
                      isUndecided={props.category === "Undecided"}
                      qvLabels={labels}
                    />
                  ))}

              {props.view === "organize" &&
                props.category === "Skip" &&
                showMore && (
                  <div className="skip-items-grid">
                    {optionIds.map((option, index) => (
                      <DraggableItem
                        questionId={props.questionId}
                        onUpdateGroup={props.onUpdateGroup}
                        key={props.options[option].optionId}
                        index={index}
                        draggableId={props.options[option].optionId}
                        option={props.options[option]}
                        view={props.view}
                        totalCredits={props.totalCredits}
                        currCost={props.currCost}
                        categories={props.categories}
                        isUndecided={props.category === "Undecided"}
                        qvLabels={labels}
                      />
                    ))}
                  </div>
                )}

              {((props.category !== "Undecided" && props.category !== "Skip") ||
                props.view === "vote") &&
                optionIds.map((option, index) => (
                  <DraggableItem
                    questionId={props.questionId}
                    onUpdateGroup={props.onUpdateGroup}
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
                    qvLabels={labels}
                    restrictVoteByCategory={props.restrictVoteByCategory}
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
                      {labels.text.emptyGroupLine1}
                      <br /> {labels.text.emptyGroupLine2}
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
