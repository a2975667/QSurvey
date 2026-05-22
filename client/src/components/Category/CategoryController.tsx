import React, { useEffect, useState } from "react";
import "./CategoryController.css";
import { getQvBinLabel, resolveQvLabels, ResolvedQvLabels } from "../../i18n/qvLabels";

export interface CategoryControllerProps {
  questionId: string;
  optionId: string;
  categories: string[];
  currentGroup: string;
  onUpdateGroup?: (optionId: string, newGroup: string) => void;
  qvLabels?: ResolvedQvLabels;
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
  qvLabels,
}) => {
  const labels = qvLabels || resolveQvLabels();
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
            title={`${labels.text.leanPrefix} ${getQvBinLabel(category, labels.aliases)}`}
          >
            {isSmallScreen ? (
              <div>{getQvBinLabel(category, labels.aliases)}</div>
            ) : (
              <div className="linebreak">{labels.text.leanPrefix} {getQvBinLabel(category, labels.aliases)}</div>
            )}
          </div>
        ))}
        <div
          className="category-button Skip"
          key="Skip"
          onClick={() => handleUpdateGroup("Skip")}
          title={labels.text.skipThisOption}
        >
          <div>{getQvBinLabel("Skip", labels.aliases)}</div>
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
          title={labels.text.returnToUndecided}
        >
          {labels.text.reassign}
        </div>
      </div>
    );
  }
};
