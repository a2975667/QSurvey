import { IQvOption } from "../../types/coreTypes";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { Container } from "../Category/Categories";
import DraggableItem from "../DraggableItem";
import { useDispatch } from "react-redux";
import { updateOptionGroup } from "../../features/qvOptionsSlice";

export interface CategoryControllerProps {
    optionId: string;
    currCategory: string;
    categories: string[];
}
export const CategoryController = (props: CategoryControllerProps) => {
    const selfDefinedCategories = props.categories.slice(0, -1);
    
    const dispatch = useDispatch();
    const updateGroupByOptionId = (optionId: string, newGroup: string) => {
        dispatch(updateOptionGroup({ optionId, newGroup }));
    };


    console.log(props.currCategory);
    if (props.currCategory === "Undecided") {
        return (
            <div className="controller-panel">
                {selfDefinedCategories.map(selfDefinedCategory => (
                    <button
                        key={selfDefinedCategory}
                        onClick={() => updateGroupByOptionId(props.optionId, selfDefinedCategory)}
                    >
                        {selfDefinedCategory}
                    </button>
                ))}
            </div>
        );
    } else {
        return (
            <div className="controller-panel">
                <button
                    key="Undefined"
                    onClick={() => updateGroupByOptionId(props.optionId, "Undecided")}
                > Redecide
                </button>
            </div>
        );
    }
};
