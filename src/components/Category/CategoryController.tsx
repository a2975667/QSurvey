import { useDispatch } from "react-redux";
import { updateOptionGroup } from "../../features/qvOptionsSlice";
import "./CategoryController.css"

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
                    <div
                        className={`category-button ${selfDefinedCategory}`}
                        key={selfDefinedCategory}
                        onClick={() => updateGroupByOptionId(props.optionId, selfDefinedCategory)}
                    >
                        <div className="linebreak"> Lean <br/> {selfDefinedCategory} </div> 
                    </div>
                ))}
                <div
                    className={`category-button Defer`}
                    key={"Defer"}
                    onClick={() => updateGroupByOptionId(props.optionId, "Defer")}
                >
                    <div>Defer</div>
                </div>
            </div>
        );
    } else {
        return (
            <div className="controller-panel">
                <div className={"category-button Undecided"}
                    key="Undefined"
                    onClick={() => updateGroupByOptionId(props.optionId, "Undecided")}
                > Redecide
                </div>
            </div>
        );
    }
};
