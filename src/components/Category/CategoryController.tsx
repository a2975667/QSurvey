import { useDispatch } from "react-redux";
import { updateOptionGroup } from "../../features/qvOptionsSlice";
import "./CategoryController.css"
import { start } from "repl";

export interface CategoryControllerProps {
    optionId: string;
    currCategory: string;
    categories: string[];
}
export const CategoryController = (props: CategoryControllerProps) => {
    // skip the last category, which is "Skip"
    console.log("CategoryController: props.categories: ", props.categories)
    var selfDefinedCategories = props.categories
    if (selfDefinedCategories[0] === "Skip") {
        console.log("CategoryController: remove skip")
        selfDefinedCategories = selfDefinedCategories.slice(1)
    }
    console.log("CategoryController: selfDefinedCategories: ", selfDefinedCategories)
    

    const dispatch = useDispatch();
    const updateGroupByOptionId = (optionId: string, newGroup: string) => {
        dispatch(updateOptionGroup({ optionId, newGroup }));
    };

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
                    className={`category-button Skip`}
                    key={"Skip"}
                    onClick={() => updateGroupByOptionId(props.optionId, "Skip")}
                >
                    <div>Skip</div>
                </div>
            </div>
        );
    } else {
        return (
            <div className="controller-panel">
                <div className={"category-button Undecided"}
                    key="Undefined"
                    onClick={() => updateGroupByOptionId(props.optionId, "Undecided")}
                > Reassign
                </div>
            </div>
        );
    }
};
