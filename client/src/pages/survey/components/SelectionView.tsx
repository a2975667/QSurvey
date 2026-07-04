import React, { useMemo } from 'react';
import {
  IBackendQuestion,
  IBackendQVPlusSetting,
  IBackendQVPlusRound,
} from '../../../types/backendTypes';
import { IQsOption } from '../../../types/coreTypes';
import { QvPlusQuestionState } from '../../../types/responseTypes';
import Category from '../../../components/Category';
import { MarkdownRenderer } from '../../../components/common/markdownRendererContract';
import { resolveQvLabels, ResolvedQvLabels } from '../../../i18n/qvLabels';

// Reuse the exact QV stylesheets so the selection stage renders with the same
// cards / category banners / containers as the voting stage.
import '../survey.css';
import './surveyLayout.css';
import '../../../components/Category/Category.css';
import '../../../components/DraggableItem/DraggableItem.css';
import '../../../components/QsNavBar/QsNavBar.css';
import './selectionView.css';

interface SelectionViewProps {
  questionId: string;
  // Used only for the title/description fallback when the round omits its own.
  question: IBackendQuestion;
  // The same IQsOption map the voting stage renders (names + descriptions + votes).
  options: { [key: string]: IQsOption };
  state: QvPlusQuestionState;
  round: IBackendQVPlusRound; // which round to render (parent decides)
  totalCredits: number;
  currCost: number;
  qvLabels?: ResolvedQvLabels;
  onSetAnswer: (
    optionId: string,
    roundId: string,
    followupId: string,
    choiceId: string,
  ) => void;
}

// Whether an option qualifies for this round's selection page based on its vote.
// 'none' means no filter is applied, so every option is shown.
const isRequired = (
  votes: number,
  filter: IBackendQVPlusSetting['rounds'][number]['requiredVoteFilter'],
): boolean => {
  switch (filter) {
    case 'upvote':   return votes > 0;
    case 'downvote': return votes < 0;
    case 'both':     return votes !== 0;
    case 'none':     return true;
    default:
      // Unknown value (bad or legacy data): don't throw — just log a warning
      // and show all options, so a bad value can't take down the survey page.
      console.warn(`Unknown requiredVoteFilter "${filter}"; showing all options.`);
      return true;
  }
};

const SelectionView: React.FC<SelectionViewProps> = ({
  questionId,
  question,
  options,
  state,
  round,
  totalCredits,
  currCost,
  qvLabels,
  onSetAnswer,
}) => {
  const labels = qvLabels || resolveQvLabels();
  const { requiredVoteFilter, followupQuestions } = round;

  // Filter each category's option list down to the options this round requires
  // (e.g. only upvoted options), mirroring the previous SelectionView behaviour.
  const filteredPositions = useMemo(() => {
    const out: { [key: string]: string[] } = {};
    Object.entries(state.positionsByGroup).forEach(([group, ids]) => {
      out[group] = ids.filter((optionId) => {
        const option = state.options[optionId];
        return option && isRequired(option.votes, requiredVoteFilter);
      });
    });
    return out;
  }, [state.positionsByGroup, state.options, requiredVoteFilter]);

  // Only show categories that still have at least one option after filtering, so
  // we don't render empty banners.
  const categories = useMemo(
    () => state.categoriesOrder.filter((c) => (filteredPositions[c]?.length ?? 0) > 0),
    [state.categoriesOrder, filteredPositions],
  );

  // Per-round answer bundle: optionId -> { followupId -> choiceId }.
  const followupAnswersByOption = state.rounds[round.roundId]?.followupAnswers ?? {};

  const handleSetFollowupAnswer = (
    optionId: string,
    followupId: string,
    choiceId: string,
  ) => {
    onSetAnswer(optionId, round.roundId, followupId, choiceId);
  };

  return (
    <div className="Container container-width-limited">
      {/* Per-round selection title (falls back to the question's title) */}
      <div className="container-width-80 title-bar">
        <div className="surveyQuestionTitle">
          {round.selectionTitle ?? question.question}
        </div>
      </div>

      <div className="container-width-80">
        {(round.selectionDescription ?? question.description) && (
          <MarkdownRenderer
            content={round.selectionDescription ?? question.description}
            allowImages
            allowVideo
          />
        )}
      </div>

      {/* Same Category render path as the voting stage — view="selection" makes
          each card read-only and adds the followup dropdowns on the right. */}
      <Category
        questionId={questionId}
        options={options}
        optionPosition={filteredPositions}
        categories={categories}
        view="selection"
        totalCredits={totalCredits}
        currCost={currCost}
        qvLabels={labels}
        followupQuestions={followupQuestions}
        followupAnswersByOption={followupAnswersByOption}
        onSetFollowupAnswer={handleSetFollowupAnswer}
      />
    </div>
  );
};

export default SelectionView;
