import reducer, {
  goToNextQvQuestion,
  goToPreviousQvQuestion,
  enqueueSubmitOp,
  markSubmitAck,
  markQvQuestionCompleted,
  markQvQuestionIncomplete,
  qvCalibratePositions,
  qvMergeGroups,
  qvMoveOption,
  qvRegroupAndOrder,
  qvSetBinsConfig,
  qvSetVotes,
  setActiveQvQuestion,
  recordQuestionResponseId,
  seedQvQuestion,
  setLikertSelection,
  setTextAnswer,
  syncQvNavigator,
  startSurveySession,
} from '../unifiedResponsesSlice';
import { UnifiedResponsesState, QvQuestionState } from '../../types/responseTypes';

const QID = 'question-1';
const OPTION_IDS = ['opt-1', 'opt-2', 'opt-3', 'opt-4'];

function seedBaseState(): UnifiedResponsesState {
  const base = reducer(undefined, { type: '@@INIT' });
  const seeded = reducer(
    base,
    seedQvQuestion({
      questionId: QID,
      totalCredits: 10,
      categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
      options: OPTION_IDS.map((optionId, idx) => ({
        optionId,
        optionName: optionId,
        group: idx < 2 ? 'Undecided' : idx === 2 ? 'Positive' : 'Negative',
        votes: idx === 3 ? -2 : idx === 2 ? 3 : idx,
      })),
    }),
  );
  return seeded;
}

function expectInvariants(state: UnifiedResponsesState, questionId: string) {
  const qv = state.byQuestionId[questionId];
  if (!qv || qv.type !== 'qv') {
    throw new Error('Expected QV question state');
  }

  const seen = new Set<string>();
  let globalIndex = 0;
  qv.categoriesOrder.forEach((group) => {
    const list = qv.positionsByGroup[group] || [];
    list.forEach((optionId, idx) => {
      const option = qv.options[optionId];
      expect(option).toBeDefined();
      expect(option.group).toBe(group);
      expect(option.groupPosition).toBe(idx);
      expect(option.globalPosition).toBe(globalIndex++);
      expect(seen.has(optionId)).toBeFalsy();
      seen.add(optionId);
    });
  });
  expect(seen.size).toBe(Object.keys(qv.options).length);
}

describe('unifiedResponsesSlice', () => {
  it('synchronises QV navigator order and active question', () => {
    const base = reducer(undefined, { type: '@@INIT' });
    const withOrder = reducer(
      base,
      syncQvNavigator({ order: ['qv-1', 'qv-2'] }),
    );
    expect(withOrder.qvNavigator.order).toEqual(['qv-1', 'qv-2']);
    expect(withOrder.qvNavigator.activeQuestionId).toBe('qv-1');

    const setActive = reducer(withOrder, setActiveQvQuestion('qv-2'));
    expect(setActive.qvNavigator.activeQuestionId).toBe('qv-2');

    const invalidActive = reducer(setActive, setActiveQvQuestion('missing'));
    expect(invalidActive.qvNavigator.activeQuestionId).toBe('qv-1');
  });

  it('advances and rewinds the active QV question', () => {
    const seededNavigator = reducer(
      undefined,
      syncQvNavigator({ order: ['qv-1', 'qv-2', 'qv-3'], activeQuestionId: 'qv-2' }),
    );
    const advanced = reducer(seededNavigator, goToNextQvQuestion());
    expect(advanced.qvNavigator.activeQuestionId).toBe('qv-3');

    const clamped = reducer(advanced, goToNextQvQuestion());
    expect(clamped.qvNavigator.activeQuestionId).toBe('qv-3');

    const rewound = reducer(clamped, goToPreviousQvQuestion());
    expect(rewound.qvNavigator.activeQuestionId).toBe('qv-2');
  });

  it('marks QV questions complete and incomplete', () => {
    const navigator = reducer(undefined, syncQvNavigator({ order: ['qv-1', 'qv-2'] }));
    const completed = reducer(navigator, markQvQuestionCompleted('qv-2'));
    expect(completed.qvNavigator.completed).toEqual({ 'qv-2': true });

    const reset = reducer(completed, markQvQuestionIncomplete('qv-2'));
    expect(reset.qvNavigator.completed['qv-2']).toBeUndefined();
  });

  it('seeds QV question with consistent structure', () => {
    const state = seedBaseState();
    expectInvariants(state, QID);
    const qv = state.byQuestionId[QID];
    expect(qv?.type).toBe('qv');
    if (qv?.type !== 'qv') return;
    expect(qv.categoriesOrder).toEqual(['Undecided', 'Positive', 'Negative', 'Skip']);
    expect(Object.keys(qv.options)).toHaveLength(OPTION_IDS.length);
  });

  it('moves option across categories and maintains invariants', () => {
    const seeded = seedBaseState();
    const moved = reducer(
      seeded,
      qvMoveOption({ questionId: QID, optionId: 'opt-1', toGroup: 'Positive', toIndex: 0 }),
    );
    expectInvariants(moved, QID);
    const qv = moved.byQuestionId[QID];
    if (qv?.type !== 'qv') return;
    expect(qv.positionsByGroup['Positive'][0]).toBe('opt-1');
    expect(qv.options['opt-1'].group).toBe('Positive');
  });

  it('updates vote totals', () => {
    const seeded = seedBaseState();
    const updated = reducer(
      seeded,
      qvSetVotes({ questionId: QID, optionId: 'opt-2', votes: 5 }),
    );
    const qv = updated.byQuestionId[QID];
    expect(qv?.type).toBe('qv');
    if (qv?.type !== 'qv') return;
    expect(qv.options['opt-2'].votes).toBe(5);
  });

  it('updates bins configuration and redistributes displaced options', () => {
    const seeded = seedBaseState();
    const withoutUndecided = reducer(
      seeded,
      qvSetBinsConfig({
        questionId: QID,
        bins: { hasUndecided: false, userDefined: ['Positive', 'Negative'], hasSkip: true },
      }),
    );
    expectInvariants(withoutUndecided, QID);
    const qv = withoutUndecided.byQuestionId[QID];
    if (qv?.type !== 'qv') return;
    expect(qv.categoriesOrder).toEqual(['Positive', 'Negative', 'Skip']);
    const fallbackGroup = qv.categoriesOrder[0];
    const fallbackSet = new Set(qv.positionsByGroup[fallbackGroup]);
    expect(qv.options['opt-1'].group).toBe(fallbackGroup);
    expect(qv.options['opt-2'].group).toBe(fallbackGroup);
    expect(
      fallbackSet.has('opt-1') ||
      fallbackSet.has('opt-2'),
    ).toBeTruthy();
  });

  it('merges groups and empties source list', () => {
    const seeded = seedBaseState();
    const merged = reducer(
      seeded,
      qvMergeGroups({ questionId: QID, source: 'Undecided', target: 'Positive' }),
    );
    expectInvariants(merged, QID);
    const qv = merged.byQuestionId[QID];
    if (qv?.type !== 'qv') return;
    expect(qv.positionsByGroup['Undecided']).toHaveLength(0);
    expect(qv.positionsByGroup['Positive']).toHaveLength(3);
  });

  it('calibrates positions after manual mutation', () => {
    const seeded = seedBaseState();
    const tampered = { ...seeded };
    const qv = { ...(tampered.byQuestionId[QID] as any) } as QvQuestionState;
    qv.positionsByGroup = {
      ...qv.positionsByGroup,
      Positive: ['opt-3', 'opt-2', 'opt-1'],
      Undecided: ['opt-0', 'opt-1'],
    };
    tampered.byQuestionId = { ...tampered.byQuestionId, [QID]: qv } as any;
    const calibrated = reducer(tampered, qvCalibratePositions({ questionId: QID }));
    expectInvariants(calibrated, QID);
  });

  it('regroups by absolute votes deterministically', () => {
    const seeded = seedBaseState();
    const regrouped = reducer(
      seeded,
      qvRegroupAndOrder({ questionId: QID, strategy: 'byVotes' }),
    );
    expectInvariants(regrouped, QID);
    const qv = regrouped.byQuestionId[QID];
    if (qv?.type !== 'qv') return;
    const positiveList = qv.positionsByGroup['Positive'];
    expect([...positiveList]).toEqual(positiveList.slice().sort());
  });

  it('records session identifiers immutably', () => {
    const seeded = seedBaseState();
    const withSession = reducer(
      seeded,
      startSurveySession({ surveyId: 'survey-123', surveyResponseId: 'resp-1', uuid: 'uuid-1' }),
    );
    const recorded = reducer(
      withSession,
      recordQuestionResponseId({ questionId: QID, questionResponseId: 'qr-1' }),
    );
    expect(recorded.surveyId).toBe('survey-123');
    expect(recorded.uuid).toBe('uuid-1');
    expect(recorded.questionResponseIds[QID]).toBe('qr-1');
  });

  it('tracks submission queue lifecycle', () => {
    const seeded = seedBaseState();
    const enqueued = reducer(
      seeded,
      enqueueSubmitOp({ questionId: QID, op: 'create', payloadHash: 'hash', correlationId: 'c-1' }),
    );
    expect(enqueued.submitQueue[0].status).toBe('pending');
    const acked = reducer(enqueued, markSubmitAck({ correlationId: 'c-1' }));
    expect(acked.submitQueue[0].status).toBe('ack');
  });

  it('captures likert and text interaction history', () => {
    const afterLikert = reducer(
      undefined,
      setLikertSelection({ questionId: 'likert-1', selection: '5', optionName: 'Strongly Agree' }),
    );
    const likertState = afterLikert.byQuestionId['likert-1'];
    expect(likertState?.type).toBe('likert');
    if (likertState?.type !== 'likert') return;
    expect(likertState.history?.changes).toHaveLength(1);

    const afterText = reducer(
      undefined,
      setTextAnswer({ questionId: 'text-1', text: 'Hello world' }),
    );
    const textState = afterText.byQuestionId['text-1'];
    expect(textState?.type).toBe('text');
    if (textState?.type !== 'text') return;
    expect(textState.text).toBe('Hello world');
    expect(textState.history?.length).toBe('Hello world'.length);
  });

  it('hydrates state from server snapshot', () => {
    const seeded = seedBaseState();
    const hydrated = reducer(seeded, {
      type: 'options/fetchSurveyResponseByUUID/fulfilled',
      payload: {
        uuid: 'resume-uuid',
        _id: 'resp-1',
        questionResponses: [
          {
            questionId: 'question-1',
            _id: 'qr-qv',
            responseContent: { votes: [{ optionId: 'opt-1', votes: 5 }] },
          },
          {
            questionId: 'likert-resume',
            _id: 'qr-likert',
            responseContent: { selection: '4', optionName: 'Agree' },
          },
          {
            questionId: 'text-resume',
            _id: 'qr-text',
            responseContent: { text: 'Great service' },
          },
        ],
      },
    });

    expect(hydrated.uuid).toBe('resume-uuid');
    expect(hydrated.questionResponseIds['likert-resume']).toBe('qr-likert');
    const likert = hydrated.byQuestionId['likert-resume'];
    if (likert?.type === 'likert') {
      expect(likert.selection).toBe('4');
    }
    const qv = hydrated.byQuestionId['question-1'];
    if (qv?.type === 'qv') {
      expect(qv.options['opt-1'].votes).toBe(5);
    }
  });
});
