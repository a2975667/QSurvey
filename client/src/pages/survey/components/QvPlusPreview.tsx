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
} from '../../../features/unifiedResponsesSlice';
import '../../../components/QsNavBar/QsNavBar.css';

// Dev-only preview page mounted at /dev/qvplus-preview.
// Renders one round's selection page at a time with prev/next navigation, so we can
// simulate the respondent's per-round flow before real wiring in Phase B5.
// Remove (and delete the route in App.tsx) when QVPlus is integrated into QuadraticSurveyPage.
const QvPlusPreview: React.FC = () => {
  const dispatch = useDispatch();
  const setting = MOCK_QVPLUS_QUESTION.setting as IBackendQVPlusSetting;
  const rounds = setting.rounds;
  const questionId = MOCK_QVPLUS_QUESTION._id;

  // Which round's selection page is currently shown. UI-only navigation state.
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const currentRound = rounds[currentRoundIndex];
  const isFirst = currentRoundIndex === 0;
  const isLast = currentRoundIndex === rounds.length - 1;

  // Read QVPlus answer state from Redux store.
  const state = useSelector(
    (s: RootState) => s.unifiedResponses.byQuestionId[questionId],
  ) as QvPlusQuestionState | undefined;

  // Seed once on mount. The slice-level reducer is idempotent.
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
        rounds: rounds.map((round) => ({
          roundId: round.roundId,
          followupIds: round.followupQuestions.map((fu) => fu.followupId),
        })),
      }),
    );
  }, [dispatch, questionId, setting.totalCredits, rounds]);

  const handleSetAnswer = (
    optionId: string,
    roundId: string,
    followupId: string,
    choiceId: string,
  ) => {
    dispatch(qvPlusSetFollowupAnswer({ questionId, roundId, optionId, followupId, choiceId }));
  };

  // Wait for seed to populate the store before rendering.
  if (!state) return null;

  return (
    <div>
      {/* Dev banner with round indicator */}
      <div
        style={{
          padding: '0.5rem 1.5rem',
          background: '#e8eaf0',
          fontSize: '0.85rem',
          color: '#555',
        }}
      >
        Dev preview · Round {currentRoundIndex + 1} of {rounds.length} ({currentRound.roundId})
      </div>

      {/* Render only the current round's selection page. */}
      <div style={{ paddingBottom: '8rem' }}>
        <SelectionView
          question={MOCK_QVPLUS_QUESTION}
          state={state}
          round={currentRound}
          onSetAnswer={handleSetAnswer}
        />
      </div>

      {/* Bottom navigation — uses original QV nav-panel classes for visual parity */}
      <div className="nav-panel">
        <div className="nav-section left">
          <button
            type="button"
            className="nav-button"
            onClick={() => setCurrentRoundIndex((i) => i - 1)}
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
            onClick={() => setCurrentRoundIndex((i) => i + 1)}
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
