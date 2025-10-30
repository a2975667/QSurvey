import reducer, {
  qvCalibratePositions,
  qvMergeGroups,
  qvMoveOption,
  qvRegroupAndOrder,
  qvSetBinsConfig,
  seedQvQuestion,
} from '../unifiedResponsesSlice';
import { UnifiedResponsesState } from '../../types/responseTypes';

const QUESTION_ID = 'qv-question';

function initialiseState(optionCount = 5): UnifiedResponsesState {
  const base = reducer(undefined, { type: '@@INIT' });
  const options = Array.from({ length: optionCount }).map((_, idx) => ({
    optionId: `option-${idx}`,
    optionName: `Option ${idx}`,
    group: idx < 2 ? 'Undecided' : idx % 2 === 0 ? 'Positive' : 'Negative',
    votes: idx - 2,
  }));

  return reducer(
    base,
    seedQvQuestion({
      questionId: QUESTION_ID,
      totalCredits: 20,
      categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
      options,
    }),
  );
}

function assertCanonical(state: UnifiedResponsesState) {
  const qv = state.byQuestionId[QUESTION_ID];
  if (!qv || qv.type !== 'qv') throw new Error('Missing QV state');

  const seen = new Set<string>();
  let global = 0;
  qv.categoriesOrder.forEach((category) => {
    const list = qv.positionsByGroup[category] || [];
    list.forEach((id, index) => {
      const option = qv.options[id];
      expect(option).toBeDefined();
      expect(option.group).toBe(category);
      expect(option.groupPosition).toBe(index);
      expect(option.globalPosition).toBe(global++);
      expect(seen.has(id)).toBeFalsy();
      seen.add(id);
    });
  });
  expect(seen.size).toBe(Object.keys(qv.options).length);
}

describe('QV bin interactions', () => {
  it('permutes all intra-bin reorderings', () => {
    const initial = initialiseState(4);
    const qv = initial.byQuestionId[QUESTION_ID];
    if (!qv || qv.type !== 'qv') throw new Error('Missing QV state');

    const targetGroup = 'Undecided';
    const optionIds = [...qv.positionsByGroup[targetGroup]];
    optionIds.forEach((optionId, fromIndex) => {
      optionIds.forEach((_, toIndex) => {
        const state = reducer(
          initial,
          qvMoveOption({ questionId: QUESTION_ID, optionId, toGroup: targetGroup, toIndex }),
        );
        assertCanonical(state);
        const groupList = (state.byQuestionId[QUESTION_ID] as any).positionsByGroup[targetGroup];
        expect(groupList.includes(optionId)).toBeTruthy();
      });
    });
  });

  it('permutes cross-bin drag and drop', () => {
    const initial = initialiseState(6);
    const qv = initial.byQuestionId[QUESTION_ID];
    if (!qv || qv.type !== 'qv') throw new Error('Missing QV state');

    const groups = qv.categoriesOrder;
    groups.forEach((fromGroup) => {
      const fromOptions = [...qv.positionsByGroup[fromGroup]];
      fromOptions.forEach((optionId) => {
        groups.forEach((targetGroup) => {
          const targetLength = (qv.positionsByGroup[targetGroup] || []).length;
          for (let insertIndex = 0; insertIndex <= targetLength; insertIndex += 1) {
            const state = reducer(
              initial,
              qvMoveOption({
                questionId: QUESTION_ID,
                optionId,
                toGroup: targetGroup,
                toIndex: insertIndex,
              }),
            );
            assertCanonical(state);
          }
        });
      });
    });
  });

  it('merges every pair of groups', () => {
    const base = initialiseState(5);
    const groups = (base.byQuestionId[QUESTION_ID] as any).categoriesOrder as string[];
    groups.forEach((source) => {
      groups.forEach((target) => {
        if (source === target) return;
        const merged = reducer(base, qvMergeGroups({ questionId: QUESTION_ID, source, target }));
        assertCanonical(merged);
      });
    });
  });

  it('updates bins configuration and recalibrates', () => {
    const base = initialiseState(4);
    const withoutSkip = reducer(
      base,
      qvSetBinsConfig({ questionId: QUESTION_ID, bins: { hasSkip: false } }),
    );
    assertCanonical(withoutSkip);

    const noUndecided = reducer(
      withoutSkip,
      qvSetBinsConfig({ questionId: QUESTION_ID, bins: { hasUndecided: false } }),
    );
    assertCanonical(noUndecided);
  });

  it('regroups by sign using default positive/negative semantics', () => {
    const base = initialiseState(6);
    const regrouped = reducer(
      base,
      qvRegroupAndOrder({ questionId: QUESTION_ID, strategy: 'bySign' }),
    );
    assertCanonical(regrouped);
  });

  it('recomputes canonical order after manual tampering', () => {
    const base = initialiseState(3);
    const tampered = { ...base } as UnifiedResponsesState;
    const clonedQv = { ...(tampered.byQuestionId[QUESTION_ID] as any) } as any;
    clonedQv.positionsByGroup = { ...clonedQv.positionsByGroup, Positive: ['option-2', 'option-1'] };
    tampered.byQuestionId = { ...tampered.byQuestionId, [QUESTION_ID]: clonedQv } as any;
    const repaired = reducer(tampered, qvCalibratePositions({ questionId: QUESTION_ID }));
    assertCanonical(repaired);
  });
});

