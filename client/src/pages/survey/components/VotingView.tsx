import { IQsOption, IQuestion } from "../../../types/coreTypes";
import { QuestionPrompt, QuestionTitle } from "../../../components/QuestionInfo/questionPrompt";
import Category from "../../../components/Category";
// import Summary from "../../../components/Summary";

interface VotingViewProps {
  questionId: string;
  question: IQuestion;
  options: { [key: string]: IQsOption };
  optionPositions: { [key: string]: string[] };
  categories: string[];
  totalCredits: number;
  currCost: number;
  style: string;
  inputType?: "wheel" | "dropdown";
  onPreviousClick?: () => void; // Make optional with '?'
}

const VotingView: React.FC<VotingViewProps> = ({
  questionId,
  question,
  options,
  optionPositions,
  categories,
  totalCredits,
  currCost,
  style,
  inputType = "dropdown",
  onPreviousClick,
}) => {
  return (
    <div className="Container container-width-limited">
      <div className="container-width-80 title-bar">
        <div className="surveyQuestionTitle">
          <QuestionTitle question={question} />
        </div>
      </div>
      <div className="container-width-80">
        <QuestionPrompt question={question} instructions={false} />

        <p className="organize-instructions">
          You have {totalCredits} credits to distribute. You can vote on each option by clicking the dropdown menu when you hover over the option.
        </p>
      </div>
      <Category
        questionId={questionId}
        options={options}
        optionPosition={optionPositions}
        categories={categories}
        view="vote"
        totalCredits={totalCredits}
        currCost={currCost}
        style={style}
        inputType={inputType}
      />
      {/* <div className="container-narrow"> */}
        {/* <Summary
          currentView="vote"
          totalCredits={totalCredits}
          currCost={currCost}
          optionList={options}
        /> */}
      {/* </div> */}
    </div>
  );
};

export default VotingView;
