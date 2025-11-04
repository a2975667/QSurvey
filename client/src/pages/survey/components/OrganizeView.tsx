import React from "react";
import { IQsOption, IQuestion } from "../../../types/coreTypes";
import { QuestionPrompt, QuestionTitle } from "../../../components/QuestionInfo/questionPrompt";
import Category from "../../../components/Category";

interface OrganizeViewProps {
  questionId: string;
  question: IQuestion;
  options: { [key: string]: IQsOption };
  optionPositions: { [key: string]: string[] };
  categories: string[];
  showConfirmation: boolean;
}

/**
 * OrganizeView component - Allows users to organize options into categories
 * before the voting phase begins. This helps users better understand all options
 * and make more informed voting decisions.
 */
const OrganizeView: React.FC<OrganizeViewProps> = ({
  questionId,
  question,
  options,
  optionPositions,
  categories,
  showConfirmation,
}) => {
  return (
    <div className="Container container-width-limited">      
      <div className="container-width-80 title-bar">
        <div className="surveyQuestionTitle">
          <QuestionTitle question={question} />
        </div>
      </div>

      {/* Confirmation message moved to QsNavBar for consistency */}


      <div className="container-width-80">
        <QuestionPrompt question={question} instructions={false} />
        
        {/* Instructions for organization phase */}
        <p className="organize-instructions">
          To better <b>organize your thoughts</b>, we ask your preference toward
          each option. Your indication does not affect the final submitted result.
          You can alter your selection as you wish. Options within groups
          are draggable. Click Next to proceed to the voting phase.
        </p>
      </div>
      
      {/* Category component for organizing options */}
      <Category
        questionId={questionId}
        options={options}
        optionPosition={optionPositions}
        categories={categories}
        view="organize"
      />
    </div>
  );
};

export default OrganizeView;
