import React from 'react';
import Select from 'react-select';
import {
  IBackendQuestion,
  IBackendQVPlusSetting,
  IBackendQVPlusStage,
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
  stage: IBackendQVPlusStage; // which selection stage to render (parent decides)
  onSetAnswer: (
    optionId: string,
    stageId: string,
    followupId: string,
    choiceId: string,
  ) => void;
  onToggleUnlock: (optionId: string, stageId: string) => void;
}

// Required = the respondent is expected to answer this option's followups by default.
// 'none' means no filter is applied, so every option is required.
const isRequired = (
  votes: number,
  filter: IBackendQVPlusSetting['requiredVoteFilter'],
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
  stage,
  onSetAnswer,
  onToggleUnlock,
}) => {
  // setting's type is a union (QVSetting | QVPlusSetting),
  // but this component is only mounted for QVPlus questions, so we assert it.
  const setting = question.setting as IBackendQVPlusSetting;
  const { requiredVoteFilter } = setting;
  const { followupQuestions } = stage;

  // Lookup map: descriptions live on the backend question, not on QvOptionState.
  const descriptionByOptionId = new Map(
    (question.options ?? []).map((o) => [o.optionId, o.description]),
  );

  return (
    <div className="Container container-width-limited">
      {/* ─── Title bar — render as <p> with surveyQuestionTitle (matches QuestionTitle component) ─── */}
      <div className="container-width-80 title-bar">
        <p className="surveyQuestionTitle">{question.question}</p>
      </div>

      {/* ─── Description + stage info + followup prompts header ─── */}
      <div className="container-width-80">
        {question.description && <p>{question.description}</p>}
        {stage.title && <h3 className="qvplus-stage-title">{stage.title}</h3>}
        {stage.description && (
          <p className="organize-instructions">{stage.description}</p>
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
          const optionIds = state.positionsByGroup[category] ?? [];
          if (optionIds.length === 0) return null;

          return (
            // category-container-parent wrapper is required so the original
            // `.category-container-parent h2 { font-weight: 500; padding-left: 0.8em }`
            // rule from Category.css applies — that's what makes the banner title
            // match QV voting exactly.
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
                // optAnswers holds this option's answers across all stages;
                // answers is the bundle (followupAnswers + manuallyUnlocked) for the current stage.
                const optAnswers = state.optionAnswers[optionId];
                const answers = optAnswers.byStage[stage.stageId];
                const required = isRequired(option.votes, requiredVoteFilter);
                const active = required || answers.manuallyUnlocked;

                return (
                  // item-wrapper.vote.${group} comes from DraggableItem.css — gives us
                  // the white card shell with the color-coded left border that matches QV.
                  // qvplus-card is our own modifier for layout overrides (left/right split, fixed widths).
                  <div
                    key={optionId}
                    className={`item-wrapper vote ${option.group} qvplus-card ${active ? 'is-active' : 'is-inactive'}`}
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

                      {/* ─── Right side: unlock + followup dropdowns ─── */}
                      <div className="vote-interaction-area">
                        <div className="qvplus-unlock-slot">
                          {!required && (
                            <button
                              type="button"
                              className={`nav-button ${answers.manuallyUnlocked ? 'primary' : ''}`}
                              onClick={() => onToggleUnlock(optionId, stage.stageId)}
                            >
                              {answers.manuallyUnlocked ? '已解鎖' : '解鎖此選項'}
                            </button>
                          )}
                        </div>
                        <div className="qvplus-followup-row">
                          {followupQuestions.map((fu) => {
                            const choiceOptions = fu.choices.map((c) => ({
                              value: c.choiceId,
                              label: c.label,
                            }));
                            const selectedValue = answers.followupAnswers[fu.followupId];
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
                                      opt && onSetAnswer(optionId, stage.stageId, fu.followupId, opt.value)
                                    }
                                    isDisabled={!active}
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
