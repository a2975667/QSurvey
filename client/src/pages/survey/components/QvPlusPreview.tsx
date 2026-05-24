import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SelectionView from './SelectionView';
import { MOCK_QVPLUS_QUESTION, MOCK_QVPLUS_STATE } from './qvPlusMockData';
import { IBackendQVPlusSetting } from '../../../types/backendTypes';
import { QvPlusQuestionState } from '../../../types/responseTypes';
import { RootState } from '../../../app/store';
import {
  seedQvPlusQuestion,
  qvPlusSetFollowupAnswer,
  qvPlusToggleUnlock,
} from '../../../features/unifiedResponsesSlice';
import '../../../components/QsNavBar/QsNavBar.css';

// Dev-only preview page mounted at /dev/qvplus-preview.
// Renders one selection stage at a time with prev/next navigation, so we can
// simulate the respondent's stage-by-stage flow before real wiring in Phase B5.
// Remove (and delete the route in App.tsx) when QVPlus is integrated into QuadraticSurveyPage.
const QvPlusPreview: React.FC = () => {
  const dispatch = useDispatch();
  const setting = MOCK_QVPLUS_QUESTION.setting as IBackendQVPlusSetting;
  const stages = setting.selectionStages;
  const questionId = MOCK_QVPLUS_QUESTION._id;

  // Which stage is currently shown. UI-only navigation state, not answer data.
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage = stages[currentStageIndex];
  const isFirst = currentStageIndex === 0;
  const isLast = currentStageIndex === stages.length - 1;

  // Read QVPlus answer state from Redux store.
  const state = useSelector(
    (s: RootState) => s.unifiedResponses.byQuestionId[questionId],
  ) as QvPlusQuestionState | undefined;

  // Seed once on mount. The slice-level reducer is idempotent, so React StrictMode's
  // double-invoke and re-mounts on HMR are safe — existing answers are preserved.
  useEffect(() => {
    dispatch(
      seedQvPlusQuestion({
        questionId,
        totalCredits: setting.totalCredits,
        categories: MOCK_QVPLUS_STATE.categoriesOrder,
        options: Object.values(MOCK_QVPLUS_STATE.options).map((opt) => ({
          optionId: opt.optionId,
          optionName: opt.optionName,
          group: opt.group,
          groupPosition: opt.groupPosition,
          globalPosition: opt.globalPosition,
          votes: opt.votes,
        })),
        stages: stages.map((stage) => ({
          stageId: stage.stageId,
          followupIds: stage.followupQuestions.map((fu) => fu.followupId),
        })),
      }),
    );
  }, [dispatch, questionId, setting.totalCredits, stages]);

  const handleSetAnswer = (
    optionId: string,
    stageId: string,
    followupId: string,
    choiceId: string,
  ) => {
    dispatch(qvPlusSetFollowupAnswer({ questionId, optionId, stageId, followupId, choiceId }));
  };

  const handleToggleUnlock = (optionId: string, stageId: string) => {
    dispatch(qvPlusToggleUnlock({ questionId, optionId, stageId }));
  };

  // Wait for seed to populate the store before rendering — useEffect fires after
  // the first render, so `state` is undefined on render #1.
  if (!state) return null;

  return (
    <div>
      {/* Dev banner with stage indicator */}
      <div
        style={{
          padding: '0.5rem 1.5rem',
          background: '#e8eaf0',
          fontSize: '0.85rem',
          color: '#555',
        }}
      >
        Dev preview · Stage {currentStageIndex + 1} of {stages.length} ({currentStage.stageId})
      </div>

      {/* Render only the current stage. Leave room at the bottom for the fixed nav bar. */}
      <div style={{ paddingBottom: '8rem' }}>
        <SelectionView
          question={MOCK_QVPLUS_QUESTION}
          state={state}
          stage={currentStage}
          onSetAnswer={handleSetAnswer}
          onToggleUnlock={handleToggleUnlock}
        />
      </div>

      {/* Bottom navigation — uses original QV nav-panel classes for visual parity */}
      <div className="nav-panel">
        <div className="nav-section left">
          <button
            type="button"
            className="nav-button"
            onClick={() => setCurrentStageIndex((i) => i - 1)}
            disabled={isFirst}
          >
            ← Previous
          </button>
        </div>
        <div className="nav-section center">
          {/* Intentionally empty — no credits block in QVPlus selection stage */}
        </div>
        <div className="nav-section right">
          <button
            type="button"
            className={`nav-button primary ${isLast ? 'disabled' : ''}`}
            onClick={() => setCurrentStageIndex((i) => i + 1)}
            disabled={isLast}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default QvPlusPreview;
