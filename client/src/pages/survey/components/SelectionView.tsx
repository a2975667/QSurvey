import React from 'react';
import Select from 'react-select';
import {
  IBackendQuestion,
  IBackendQVPlusSetting,
  IBackendQVPlusRound,
} from '../../../types/backendTypes';
import { QvPlusQuestionState } from '../../../types/responseTypes';

// Reuse the existing QV stylesheets so cards / headers / containers look
// identical to the voting stage.
import '../survey.css';
import './surveyLayout.css';
import '../../../components/Category/Category.css';
import '../../../components/DraggableItem/DraggableItem.css';
import '../../../components/QsNavBar/QsNavBar.css';
import './selectionView.css';

interface SelectionViewProps {
  question: IBackendQuestion;
  state: QvPlusQuestionState;
  round: IBackendQVPlusRound; // which round to render (parent decides)
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
      throw new Error(`Unhandled filter: ${filter}`);
  }
};

const formatVotes = (votes: number): string => (votes > 0 ? `+${votes}` : String(votes));

const SelectionView: React.FC<SelectionViewProps> = ({
  question,
  state,
  round,
  onSetAnswer,
}) => {
  const { requiredVoteFilter, followupQuestions } = round;

  // Lookup map: descriptions live on the backend question, not on QvOptionState.
  const descriptionByOptionId = new Map(
    (question.options ?? []).map((o) => [o.optionId, o.description]),
  );

  // Per-round answer bundle. Each option's followup answers live under
  // state.rounds[round.roundId].followupAnswers[optionId].
  const roundAnswers = state.rounds[round.roundId]?.followupAnswers ?? {};

  return (
    <div className="Container container-width-limited">
      {/* ─── Title bar — render as <p> with surveyQuestionTitle (matches QuestionTitle component) ─── */}
      <div className="container-width-80 title-bar">
        <p className="surveyQuestionTitle">{question.question}</p>
      </div>

      {/* ─── Description + round info + followup prompts header ─── */}
      <div className="container-width-80">
        {question.description && <p>{question.description}</p>}
        {round.selectionTitle && <h3 className="qvplus-stage-title">{round.selectionTitle}</h3>}
        {round.selectionDescription && (
          <p className="organize-instructions">{round.selectionDescription}</p>
        )}
        <div className="qvplus-followup-prompts">
          {followupQuestions.map((fu, idx) => (
            <div key={fu.followupId} className="qvplus-prompt">
              <strong>Q{idx + 1}.</strong> {fu.prompt}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Cards area (same canvas + category headers as voting stage) ─── */}
      <div className="categoryCanvasContainer vote">
        {state.categoriesOrder.map((category) => {
          // Filter options at the source — non-required options are hidden, not grayed.
          const optionIds = (state.positionsByGroup[category] ?? []).filter((optionId) =>
            isRequired(state.options[optionId].votes, requiredVoteFilter),
          );
          if (optionIds.length === 0) return null;

          return (
            <div
              key={category}
              className={`category-container-parent vote ${category}`}
            >
              {/* Colored banner header — uses original QV class */}
              <div className={`viewCategoryTitle viewCategoryTitle-${category}`}>
                <h2 className="viewCategoryTitle-title">
                  {category === 'Skip' ? 'Skip' : `Lean ${category}`}
                </h2>
              </div>

              {optionIds.map((optionId) => {
                const option = state.options[optionId];
                const followupAnswers = roundAnswers[optionId] ?? {};

                return (
                  <div
                    key={optionId}
                    className={`item-wrapper vote ${option.group} qvplus-card`}
                  >
                    <div className={`optionCard ${option.group}`}>
                      {/* ─── Left side: name + votes + description ─── */}
                      <div className={`organizer-info ${option.group}`}>
                        <div className="organizer-info-title">
                          {option.optionName} ({formatVotes(option.votes)} 票)
                        </div>
                        {descriptionByOptionId.get(optionId) && (
                          <div className="organizer-info-des">
                            {descriptionByOptionId.get(optionId)}
                          </div>
                        )}
                      </div>

                      {/* ─── Right side: followup dropdowns ─── */}
                      <div className="vote-interaction-area">
                        <div className="qvplus-followup-row">
                          {followupQuestions.map((fu) => {
                            const choiceOptions = fu.choices.map((c) => ({
                              value: c.choiceId,
                              label: c.label,
                            }));
                            const selectedValue = followupAnswers[fu.followupId];
                            const selectedOption =
                              choiceOptions.find((o) => o.value === selectedValue) ?? null;

                            return (
                              <div key={fu.followupId} className="qvplus-followup-block">
                                <span className="qvplus-followup-label">{fu.prompt}</span>
                                <div className="select-dropdown-container">
                                  <Select
                                    className="select-dropdown-menu"
                                    classNamePrefix="select"
                                    value={selectedOption}
                                    options={choiceOptions}
                                    onChange={(opt) =>
                                      opt && onSetAnswer(optionId, round.roundId, fu.followupId, opt.value)
                                    }
                                    placeholder="請選擇"
                                    menuPortalTarget={document.body}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectionView;
