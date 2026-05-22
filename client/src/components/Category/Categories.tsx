import { DragDropContext, DragUpdate, Droppable, DropResult } from "@hello-pangea/dnd";
import React, { useState } from "react";
import styled from "@emotion/styled";
import { IQsOption } from "../../types/coreTypes";
import { CustomButton } from '../Button/Button';
import DraggableItem from "../DraggableItem";
import { CategoryColumn } from "./CategoryColumn";
import { useDispatch } from "react-redux";
import {
  qvMoveOption,
  qvRegroupAndOrder,
  qvCalibratePositions,
} from "../../features/unifiedResponsesSlice";
import { debugLog } from "../../utils/debugLog";
import './Category.css'

const grid = 8;

export const Container = styled.div`
  margin: 8px;
  border: 1px solid lightgrey;
  border-radius: 2px;
`;

const QuoteItem = styled.div`
  width: 200px;
  border: 1px solid grey;
  margin-bottom: ${grid}px;
  background-color: lightblue;
  padding: ${grid}px;
`;

export interface CategoryProps {
  questionId: string;
  options: { [key: string]: IQsOption };
  optionPosition: { [key: string]: string[] };
  categories: string[];
  view: string;
  totalCredits?: number;
  currCost?: number;
  style?: string;
  inputType?: "wheel" | "dropdown";
}

export function Category(props: CategoryProps) {
  const dispatch = useDispatch();
  const [scrollInterval, setScrollInterval] = useState<NodeJS.Timeout | null>(null);
  const [scrollDirection, setScrollDirection] = useState<'left' | 'right' | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Add event listener for scroll to update indicators
  React.useEffect(() => {
    const checkScroll = () => {
      if (!canvasRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = canvasRef.current;
      const canvas = canvasRef.current;
      
      // Show left arrow if not at the beginning
      if (scrollLeft > 10) {
        canvas.classList.add('scroll-left');
      } else {
        canvas.classList.remove('scroll-left');
      }
      
      // Show right arrow if not at the end
      if (scrollLeft < scrollWidth - clientWidth - 10) {
        canvas.classList.add('scroll-right');
      } else {
        canvas.classList.remove('scroll-right');
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('scroll', checkScroll);
      }
    };
  }, []);

  // Auto-scroll logic during drag
  const startAutoScroll = (direction: 'left' | 'right') => {
    if (scrollInterval) {
      clearInterval(scrollInterval);
    }
    
    const interval = setInterval(() => {
      if (!canvasRef.current) return;
      
      const scrollAmount = direction === 'left' ? -1 : 1;
      canvasRef.current.scrollLeft += scrollAmount;
    }, 30);
    
    setScrollInterval(interval);
    setScrollDirection(direction);
  };

  const stopAutoScroll = () => {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      setScrollInterval(null);
    }
    setScrollDirection(null);
  };

  const onDragStart = (): void => {
    const element = document.querySelector('.isDragging[true]') as HTMLElement;
    if (element) {
      element.style.width = '30%';
    }
  };

  const onDragUpdate = (update: DragUpdate) => {
    if (!canvasRef.current || props.view !== 'organize') return;
  
    const e = window.event as MouseEvent | undefined;
    if (!e || typeof e.clientX === 'undefined') return;
  
    const canvas = canvasRef.current;
    const { left, right } = canvas.getBoundingClientRect();
    const buffer = 100; // px from edge
  
    if (e.clientX < left + buffer) {
      if (scrollDirection !== 'left') startAutoScroll('left');
    } else if (e.clientX > right - buffer) {
      if (scrollDirection !== 'right') startAutoScroll('right');
    } else {
      if (scrollDirection) stopAutoScroll();
    }
  };

  const reorderCategoryOptions = (category: string) => {
    dispatch(qvRegroupAndOrder({ questionId: props.questionId, strategy: 'byVotes' }));
    dispatch(qvCalibratePositions({ questionId: props.questionId }));
  };

  const handleUpdateGroup = (optionId: string, newGroup: string) => {
    const targetList = props.optionPosition[newGroup] || [];
    const toIndex = newGroup === 'Undecided' ? targetList.length : 0;
    dispatch(
      qvMoveOption({
        questionId: props.questionId,
        optionId,
        toGroup: newGroup,
        toIndex,
      }),
    );
    dispatch(qvCalibratePositions({ questionId: props.questionId }));
  };

  function onDragEnd(result: DropResult) {
    // Stop any auto-scrolling
    stopAutoScroll();
    
    if (!result.destination) {
      return;
    }

    if (
      result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index
    ) {
      return;
    }

    const category = result.source.droppableId;
    const newItemArray = Array.from(category);
    // get the source list of optionIds
    const sourceList = props.optionPosition[category];
    const sourceIndex = result.source.index;

    // get the source list of the new destination option list and index
    const destinationList =
      props.optionPosition[result.destination.droppableId];
    const destinationIndex = result.destination.index;

    debugLog(
      {optionId: result.draggableId,
      originalCategory: category,
      newCategory: result.destination.droppableId,
      newPosition: destinationIndex,}
    )

    if (!props.questionId) return;
    dispatch(
      qvMoveOption({
        questionId: props.questionId,
        optionId: result.draggableId,
        toGroup: result.destination.droppableId,
        toIndex: destinationIndex,
      }),
    );
    dispatch(qvCalibratePositions({ questionId: props.questionId }));
  }

  // Debug Toggle order of organize categories
  let populateSequence = props.categories;
  if (props.view === "organize") {
    // in the organize view, we need to show elements in the "Undecided" initial category
    populateSequence = ["Undecided"].concat(props.categories);
  } else if ( props.style === "text" ) {
    // if the style is text, we need to do: show only the undecided category
    populateSequence = ["Undecided"];
  } else {
    // move the first element to the end and store it in populateSequence
    // populateSequence = props.categories.slice(1).concat(props.categories.slice(0, 1));
    populateSequence = props.categories;
    // console.log("populateSequence: ", populateSequence)
  }
  // console.log("populateSequence: ", populateSequence)
  // Split the categories into undecided/skip categories and the main bins
  const topCategories = props.view === "organize" ? ["Undecided", "Skip"] : [];
  const scrollableCategories = populateSequence.filter(cat => !topCategories.includes(cat));

  // Handle dragging of category headers for scrolling
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!canvasRef.current) return;
    
    // Allow dragging from the category container parent, but not from draggable items 
    // (to avoid interfering with drag and drop)
    const target = e.target as HTMLElement;
    const isFromCategoryParent = target.closest('.category-container-parent');
    const isDraggableItem = target.closest('.draggable-item');
    
    if (!isFromCategoryParent || isDraggableItem) return;
    
    setIsDragging(true);
    setStartX(e.pageX - canvasRef.current.offsetLeft);
    setScrollLeft(canvasRef.current.scrollLeft);
    
    // Add grab cursor
    document.body.style.cursor = 'grabbing';
    
    // Prevent default to avoid text selection
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isDragging || !canvasRef.current) return;
    
    const x = e.pageX - canvasRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    canvasRef.current.scrollLeft = scrollLeft - walk;
    
    // Prevent default to avoid text selection while dragging
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  };

  // Ensure we stop dragging if mouse leaves the component
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    }
  };

  // Add side peeking behavior - this will scroll to show the next bin when a bin is clicked
  const handleBinClick = (index: number) => {
    if (!canvasRef.current) return;
    
    const bins = Array.from(canvasRef.current.children);
    if (index >= bins.length) return;
    
    const bin = bins[index] as HTMLElement;
    
    // Always scroll to this bin to center it
    canvasRef.current.scrollTo({
      left: bin.offsetLeft - 10,
      behavior: 'smooth'
    });
  };

  // In the organize view, we want two completely separate sections:
  // 1. The top card (Undecided) - fixed and static
  // 2. The scrollable bins below (Positive, Negative, Neutral)
  
  if (props.view === "organize") {
    // Extract categories for the organize view
    const undecidedCategory = topCategories.find(cat => cat === "Undecided");
    const skipCategory = topCategories.find(cat => cat === "Skip");
    const binCategories = scrollableCategories.filter(cat => cat !== "Skip");
    
    return (
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart} onDragUpdate={onDragUpdate}>
        {/* Updated responsive organization layout */}
        <div className="organization-layout">
          {/* TOP SECTION - CARD STACK */}
          <div className="card-section">
            {undecidedCategory && (
              <CategoryColumn
                questionId={props.questionId}
                key={undecidedCategory}
                categories={props.categories}
                category={undecidedCategory}
                options={props.options}
                optionList={props.optionPosition[undecidedCategory]}
                view={props.view}
                totalCredits={props.totalCredits}
                currCost={props.currCost}
                style={props.style}
                inputType={props.inputType}
                onReorderCategory={reorderCategoryOptions}
                onUpdateGroup={handleUpdateGroup}
              />
            )}
          </div>
          
          {/* SKIP SECTION - Positioned below the card and above the bins */}
          {skipCategory && (
            <div className="skip-section">
              <CategoryColumn
                questionId={props.questionId}
                key={skipCategory}
                categories={props.categories}
                category={skipCategory}
                options={props.options}
                optionList={props.optionPosition[skipCategory]}
                view={props.view}
                totalCredits={props.totalCredits}
                currCost={props.currCost}
                style={props.style}
                inputType={props.inputType}
                onReorderCategory={reorderCategoryOptions}
                onUpdateGroup={handleUpdateGroup}
              />
            </div>
          )}
          
          {/* BOTTOM SECTION - SCROLLABLE BINS */}
          <div className="bins-section">
            {binCategories.length > 0 && (
              <div 
                className="scrollable-bins" 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {binCategories.map((category, index) => (
                  <CategoryColumn
                    questionId={props.questionId}
                    key={category}
                    categories={props.categories}
                    category={category}
                    options={props.options}
                    optionList={props.optionPosition[category]}
                    view={props.view}
                    totalCredits={props.totalCredits}
                    currCost={props.currCost}
                    style={props.style}
                    inputType={props.inputType}
                    onClick={() => handleBinClick(index)}
                    onReorderCategory={reorderCategoryOptions}
                    onUpdateGroup={handleUpdateGroup}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    );
  }
  
  // For other views, use the original layout
  return (
    <div className={`categoryCanvasContainer ${props.view}`}>
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart} onDragUpdate={onDragUpdate}>
        {populateSequence.map((category) => (
          <CategoryColumn
            questionId={props.questionId}
            key={category}
            categories={props.categories}
            category={category}
            options={props.options}
            optionList={props.optionPosition[category]}
            view={props.view}
            totalCredits={props.totalCredits}
            currCost={props.currCost}
            style={props.style}
            inputType={props.inputType}
            onReorderCategory={reorderCategoryOptions}
            onUpdateGroup={handleUpdateGroup}
          />
        ))}
      </DragDropContext>
    </div>
  );
}
