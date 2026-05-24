import React, { useState } from 'react';
import SelectionView from './SelectionView';
import { MOCK_QVPLUS_QUESTION, MOCK_QVPLUS_STATE } from './qvPlusMockData';
import { IBackendQVPlusSetting } from '../../../types/backendTypes';
import '../../../components/QsNavBar/QsNavBar.css';

// Dev-only preview page mounted at /dev/qvplus-preview.
// Renders one selection stage at a time with prev/next navigation, so we can
// simulate the respondent's stage-by-stage flow before real wiring in Phase B.
// Remove (and delete the route in App.tsx) when QVPlus is wired through Redux.
const QvPlusPreview: React.FC = () => {
  const setting = MOCK_QVPLUS_QUESTION.setting as IBackendQVPlusSetting;
  const stages = setting.selectionStages;

  // Which stage is currently shown.
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage = stages[currentStageIndex];
  const isFirst = currentStageIndex === 0;
  const isLast = currentStageIndex === stages.length - 1;

  // Local mutable state for Phase A prototype. Phase B replaces this with Redux.
  const [state, setState] = useState(MOCK_QVPLUS_STATE);

  // Update a single (option, stage, followup) answer. Verbose because we have to
  // rebuild every layer immutably; Redux Toolkit + Immer will collapse this in Phase B.
  const handleSetAnswer = (
    optionId: string,
    stageId: string,
    followupId: string,
    choiceId: string,
  ) => {
    setState((prev) => ({
      ...prev,
      optionAnswers: {
        ...prev.optionAnswers,
        [optionId]: {
          byStage: {
            ...prev.optionAnswers[optionId].byStage,
            [stageId]: {
              ...prev.optionAnswers[optionId].byStage[stageId],
              followupAnswers: {
                ...prev.optionAnswers[optionId].byStage[stageId].followupAnswers,
                [followupId]: choiceId,
              },
            },
          },
        },
      },
    }));
  };

  // Toggle manuallyUnlocked for a single (option, stage) pair.
  const handleToggleUnlock = (optionId: string, stageId: string) => {
    setState((prev) => ({
      ...prev,
      optionAnswers: {
        ...prev.optionAnswers,
        [optionId]: {
          byStage: {
            ...prev.optionAnswers[optionId].byStage,
            [stageId]: {
              ...prev.optionAnswers[optionId].byStage[stageId],
              manuallyUnlocked:
                !prev.optionAnswers[optionId].byStage[stageId].manuallyUnlocked,
            },
          },
        },
      },
    }));
  };

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
