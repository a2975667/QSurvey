import React, { useEffect, useState } from "react";
import "./CategoryController.css";

export interface CategoryControllerProps {
  questionId: string;
  optionId: string;
  categories: string[];
  currentGroup: string;
  onUpdateGroup?: (optionId: string, newGroup: string) => void;
}

/**
 * CategoryController component
 *
 * Provides buttons for categorizing options during the organization phase.
 * Displays different sets of buttons based on whether an option is categorized.
 */
export const CategoryController: React.FC<CategoryControllerProps> = ({
  optionId,
  categories,
  currentGroup,
  onUpdateGroup,
}) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const userDefinedCategories = categories.filter(
    (category) => category !== "Undecided" && category !== "Skip",
  );

  const isSmallScreen = windowWidth <= 480;

  const handleUpdateGroup = (newGroup: string) => {
    onUpdateGroup?.(optionId, newGroup);
  };

  if (currentGroup === "Undecided") {
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
