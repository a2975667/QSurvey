// This page is for you to list your components and test its functionality like storybook

import { Draggable } from "react-beautiful-dnd";
import Category from "../../components/Category"
import DraggableItem from "../../components/DraggableItem"
interface QuoteType {
  id: string;
  content: string;
}

const grid = 8;

function Quote({ quote, index }: { quote: QuoteType; index: number }) {
    return (
      <Draggable draggableId={quote.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <DraggableItem test={'test1'}/>
          </div>
        )}
      </Draggable>
    );
  }
  
export const TestPage = () => {
    return <>
        <Category>
            <Quote quote={{id: '1', content: 'test'}} index={1}></Quote>
            <Quote quote={{id: '2', content: '2'}} index={2}></Quote>
            <Quote quote={{id: '3', content: '3'}} index={3}></Quote>
            <Quote quote={{id: '4', content: '4'}} index={4}></Quote>
        </Category>
    </>
}
