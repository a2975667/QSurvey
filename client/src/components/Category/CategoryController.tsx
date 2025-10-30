import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateOptionGroup } from "../../features/qsOptionsSlice";
import { RootState } from "../../app/store";
import "./CategoryController.css";

export interface CategoryControllerProps {
  optionId: string;
  categories: string[];
}

/**
 * CategoryController component
 *
 * Provides buttons for categorizing options during the organization phase.
 * Displays different sets of buttons based on whether an option is categorized.
 */
export const CategoryController: React.FC<CategoryControllerProps> = ({ optionId, categories }) => {
  const dispatch = useDispatch();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const currentCategory = useSelector(
    (state: RootState) => state.qsOptions.byId[optionId]?.group
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    console.log(`Option ${optionId} current category: ${currentCategory}`);
  }, [optionId, currentCategory]);

  const userDefinedCategories = categories.filter(
    (category) => category !== "Undecided" && category !== "Skip",
  );

  const isSmallScreen = windowWidth <= 480;

  const handleUpdateGroup = (newGroup: string) => {
    dispatch(updateOptionGroup({ optionId, newGroup }));
  };

  if (currentCategory === "Undecided") {
    return (
      <div className="controller-panel">
        {userDefinedCategories.map((category) => (
          <div
            className={`category-button ${category}`}
            key={category}
            onClick={() => handleUpdateGroup(category)}
            title={`Lean ${category}`}
          >
            {isSmallScreen ? (
              <div>{category}</div>
            ) : (
              <div className="linebreak">Lean {category}</div>
            )}
          </div>
        ))}
        <div
          className="category-button Skip"
          key="Skip"
          onClick={() => handleUpdateGroup("Skip")}
          title="Skip this option for now"
        >
          <div>Skip</div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="controller-panel">
        <div
          className="category-button Undecided"
          key="Undecided"
          onClick={() => handleUpdateGroup("Undecided")}
          title="Return to undecided list"
        >
          Reassign
        </div>
      </div>
    );
  }
};
