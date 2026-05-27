import React from "react";
import { IQsOption, IQuestion } from "../../../types/coreTypes";
import { QuestionPrompt, QuestionTitle } from "../../../components/QuestionInfo/questionPrompt";
import Category from "../../../components/Category";
import { resolveQvLabels, ResolvedQvLabels } from "../../../i18n/qvLabels";

interface OrganizeViewProps {
  questionId: string;
  question: IQuestion;
  options: { [key: string]: IQsOption };
  optionPositions: { [key: string]: string[] };
  categories: string[];
  showConfirmation: boolean;
  qvLabels?: ResolvedQvLabels;
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
  qvLabels,
}) => {
  const labels = qvLabels || resolveQvLabels();
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
          To better <b>{labels.text.organizeInstructionLead}</b>, {labels.text.organizeInstructionBody}
        </p>
      </div>
      
      {/* Category component for organizing options */}
      <Category
        questionId={questionId}
        options={options}
        optionPosition={optionPositions}
        categories={categories}
        view="organize"
        qvLabels={labels}
      />
    </div>
  );
};

export default OrganizeView;
