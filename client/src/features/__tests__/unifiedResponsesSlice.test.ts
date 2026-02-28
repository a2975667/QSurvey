import reducer, {
  enqueueSubmitOp,
  goToNextApprovalQuestion,
  goToNextQvQuestion,
  goToPreviousApprovalQuestion,
  goToPreviousQvQuestion,
  markApprovalQuestionCompleted,
  markApprovalQuestionIncomplete,
  markQvQuestionCompleted,
  markQvQuestionIncomplete,
  markSubmitAck,
  qvCalibratePositions,
  qvMergeGroups,
  qvMoveOption,
  qvRegroupAndOrder,
  qvSetBinsConfig,
  qvSetVotes,
  recordQuestionResponseId,
  reorderApprovalOptions,
  seedApprovalQuestion,
  seedQvQuestion,
  setActiveQvQuestion,
  setApprovalSelections,
  setLikertSelection,
  setSelectionAnswer,
  setTextAnswer,
  startSurveySession,
  syncApprovalNavigator,
  syncQvNavigator,
  toggleApprovalOption,
} from '../unifiedResponsesSlice';
import { UnifiedResponsesState, QvQuestionState } from '../../types/responseTypes';

const QID = 'question-1';
const OPTION_IDS = ['opt-1', 'opt-2', 'opt-3', 'opt-4'];
const APPROVAL_QID = 'approval-1';
const APPROVAL_OPTION_IDS = ['app-1', 'app-2', 'app-3'];

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

function seedApprovalState(): UnifiedResponsesState {
  const base = reducer(undefined, { type: '@@INIT' });
  return reducer(
    base,
    seedApprovalQuestion({
      questionId: APPROVAL_QID,
      options: APPROVAL_OPTION_IDS.map((optionId, idx) => ({
        optionId,
        optionName: `Option ${idx + 1}`,
        description: `Desc ${idx + 1}`,
      })),
      order: [...APPROVAL_OPTION_IDS],
    }),
  );
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

  it('captures selection answers', () => {
    const updated = reducer(
      undefined,
      setSelectionAnswer({ questionId: 'selection-1', selectedOptionIds: ['optA', 'optB'] }),
    );
    const selectionState = updated.byQuestionId['selection-1'];
    expect(selectionState?.type).toBe('selection');
    if (selectionState?.type !== 'selection') return;
    expect(selectionState.selectedOptionIds).toEqual(['optA', 'optB']);
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

  it('hydrates resume payload with explicit group and position metadata', () => {
    const seeded = seedBaseState();

    const resumePayload = {
      _id: 'resume-123',
      uuid: 'resume-uuid',
      questionResponses: [
        {
          _id: 'qr-1',
          questionId: QID,
          responseContent: {
            votes: [
              { optionId: 'opt-3', votes: 2, optionName: 'Option 3' },
              { optionId: 'opt-1', votes: 5, optionName: 'Option 1' },
              { optionId: 'opt-4', votes: -1, optionName: 'Option 4' },
              { optionId: 'opt-2', votes: 0, optionName: 'Option 2' },
            ],
            group: {
              'opt-1': 'Positive',
              'opt-2': 'Negative',
              'opt-3': 'Undecided',
              'opt-4': 'Skip',
            },
            position: {
              'opt-1': 1,
              'opt-2': 3,
              'opt-3': 0,
              'opt-4': 2,
            },
          },
        },
      ],
    };

    const hydrated = reducer(seeded, {
      type: 'options/fetchSurveyResponseByUUID/fulfilled',
      payload: resumePayload,
    });

    expect(hydrated.surveyResponseId).toBe('resume-123');
    expect(hydrated.uuid).toBe('resume-uuid');
    expect(hydrated.questionResponseIds[QID]).toBe('qr-1');

    const qv = hydrated.byQuestionId[QID];
    expect(qv?.type).toBe('qv');
    if (qv?.type !== 'qv') return;

    expect(qv.positionsByGroup['Undecided']).toEqual(['opt-3']);
    expect(qv.positionsByGroup['Positive']).toEqual(['opt-1']);
    expect(qv.positionsByGroup['Negative']).toEqual(['opt-2']);
    expect(qv.positionsByGroup['Skip']).toEqual(['opt-4']);

    expect(qv.options['opt-1'].groupPosition).toBe(0);
    expect(qv.options['opt-2'].group).toBe('Negative');
    expect(qv.options['opt-3'].votes).toBe(2);
    expect(qv.options['opt-4'].votes).toBe(-1);

    expectInvariants(hydrated as UnifiedResponsesState, QID);
  });

  describe('approval responses', () => {
    it('syncs approval navigator and navigates', () => {
      const base = reducer(undefined, { type: '@@INIT' });
      const withOrder = reducer(base, syncApprovalNavigator({ order: [APPROVAL_QID] }));
      expect(withOrder.approvalNavigator.order).toEqual([APPROVAL_QID]);
      expect(withOrder.approvalNavigator.activeQuestionId).toBe(APPROVAL_QID);

      const advanced = reducer(withOrder, goToNextApprovalQuestion());
      expect(advanced.approvalNavigator.activeQuestionId).toBe(APPROVAL_QID);

      const rewound = reducer(advanced, goToPreviousApprovalQuestion());
      expect(rewound.approvalNavigator.activeQuestionId).toBe(APPROVAL_QID);

      const completed = reducer(withOrder, markApprovalQuestionCompleted(APPROVAL_QID));
      expect(completed.approvalNavigator.completed[APPROVAL_QID]).toBe(true);

      const reset = reducer(completed, markApprovalQuestionIncomplete(APPROVAL_QID));
      expect(reset.approvalNavigator.completed[APPROVAL_QID]).toBeUndefined();
    });

    it('toggles approval selections and records history', () => {
      const seeded = seedApprovalState();
      const toggled = reducer(
        seeded,
        toggleApprovalOption({ questionId: APPROVAL_QID, optionId: APPROVAL_OPTION_IDS[0], at: 10 }),
      );
      const approval = toggled.byQuestionId[APPROVAL_QID];
      expect(approval?.type).toBe('approval');
      if (approval?.type !== 'approval') return;
      expect(approval.approvals).toEqual([APPROVAL_OPTION_IDS[0]]);
      expect(approval.history?.events?.[0]).toMatchObject({
        type: 'toggle',
        optionId: APPROVAL_OPTION_IDS[0],
        action: 'approve',
      });
    });

    it('enforces configured maxApprovals during toggle and set actions', () => {
      const capped = reducer(
        reducer(undefined, { type: '@@INIT' }),
        seedApprovalQuestion({
          questionId: APPROVAL_QID,
          options: APPROVAL_OPTION_IDS.map((optionId, idx) => ({
            optionId,
            optionName: `Option ${idx + 1}`,
          })),
          order: [...APPROVAL_OPTION_IDS],
          maxApprovals: 1,
          unlimitedApprovals: false,
        }),
      );

      const first = reducer(
        capped,
        toggleApprovalOption({
          questionId: APPROVAL_QID,
          optionId: APPROVAL_OPTION_IDS[0],
          at: 1,
        }),
      );
      const blocked = reducer(
        first,
        toggleApprovalOption({
          questionId: APPROVAL_QID,
          optionId: APPROVAL_OPTION_IDS[1],
          at: 2,
        }),
      );

      const approval = blocked.byQuestionId[APPROVAL_QID];
      expect(approval?.type).toBe('approval');
      if (approval?.type !== 'approval') return;
      expect(approval.approvals).toEqual([APPROVAL_OPTION_IDS[0]]);

      const viaSet = reducer(
        blocked,
        setApprovalSelections({
          questionId: APPROVAL_QID,
          approvals: [APPROVAL_OPTION_IDS[1], APPROVAL_OPTION_IDS[2]],
          at: 3,
        }),
      );
      const setApproval = viaSet.byQuestionId[APPROVAL_QID];
      expect(setApproval?.type).toBe('approval');
      if (setApproval?.type !== 'approval') return;
      expect(setApproval.approvals).toEqual([APPROVAL_OPTION_IDS[1]]);
    });

    it('reorders approval options and appends history events', () => {
      const seeded = seedApprovalState();
      const nextOrder = [APPROVAL_OPTION_IDS[2], APPROVAL_OPTION_IDS[0], APPROVAL_OPTION_IDS[1]];
      const reordered = reducer(
        seeded,
        reorderApprovalOptions({ questionId: APPROVAL_QID, order: nextOrder, at: 20 }),
      );
      const approval = reordered.byQuestionId[APPROVAL_QID];
      expect(approval?.type).toBe('approval');
      if (approval?.type !== 'approval') return;
      expect(approval.order).toEqual(nextOrder);
      expect(approval.history?.events?.[approval.history.events.length - 1]).toMatchObject({
        type: 'reorder',
        order: nextOrder,
      });
    });
  });
});
