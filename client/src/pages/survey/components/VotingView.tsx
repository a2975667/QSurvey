import { IQsOption, IQuestion } from "../../../types/coreTypes";
import { QuestionPrompt, QuestionTitle } from "../../../components/QuestionInfo/questionPrompt";
import Category from "../../../components/Category";
import { resolveQvLabels, ResolvedQvLabels } from "../../../i18n/qvLabels";
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
  qvLabels?: ResolvedQvLabels;
  restrictVoteByCategory?: boolean;
  markOverBudgetVotes?: boolean;
  // QVPlus round 2+: when provided, shows a button that restores this round's
  // votes/grouping to the previous round's snapshot. Omitted (undefined) when
  // restore isn't available, so the button simply doesn't render.
  onRestorePreviousRound?: () => void;
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
  qvLabels,
  restrictVoteByCategory = false,
  markOverBudgetVotes = false,
  onRestorePreviousRound,
}) => {
  const labels = qvLabels || resolveQvLabels();
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
          {labels.text.votingInstruction(totalCredits)}
        </p>
        {onRestorePreviousRound && (
          <button
            type="button"
            className="restore-previous-round-button"
            onClick={onRestorePreviousRound}
          >
            {labels.text.restorePreviousRound}
          </button>
        )}
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
        qvLabels={labels}
        restrictVoteByCategory={restrictVoteByCategory}
        markOverBudgetVotes={markOverBudgetVotes}
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
