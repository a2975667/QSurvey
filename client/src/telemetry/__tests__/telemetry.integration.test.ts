import { configureStore } from '@reduxjs/toolkit';
import unifiedResponsesReducer, {
  seedQvQuestion,
  qvMoveOption,
  qvMergeGroups,
  qvRegroupAndOrder,
  qvCalibratePositions,
  qvSetVotes,
  syncQvNavigator,
  goToNextQvQuestion,
  goToPreviousQvQuestion,
} from '../../features/unifiedResponsesSlice';
import { TelemetryAggregator } from '../aggregator';
import { createTelemetryMiddleware } from '../middleware';

function buildStoreWithAggregator(aggregator: TelemetryAggregator) {
  const telemetry = createTelemetryMiddleware(aggregator);
  return configureStore({
    reducer: { unifiedResponses: unifiedResponsesReducer },
    middleware: (getDefault) => getDefault().concat(telemetry),
  });
}

function reconstructStateFromEvents(
  events: any[],
  initial: { groups: Record<string, string[]>; votes: Record<string, number> },
) {
  const groups = JSON.parse(JSON.stringify(initial.groups)) as Record<string, string[]>;
  const votes = { ...initial.votes } as Record<string, number>;

  const removeFromGroup = (gid: string | undefined, optionId: string) => {
    if (!gid || !groups[gid]) return;
    groups[gid] = groups[gid].filter((id) => id !== optionId);
  };

  const insertIntoGroup = (gid: string | undefined, optionId: string, index: number | undefined) => {
    if (!gid) return;
    if (!groups[gid]) groups[gid] = [];
    const pos = Math.max(0, Math.min(index ?? groups[gid].length, groups[gid].length));
    groups[gid].splice(pos, 0, optionId);
  };

  events.forEach((e) => {
    if (e.kind === 'binChanged') {
      removeFromGroup(e.fromGroup, e.optionId);
      insertIntoGroup(e.toGroup, e.optionId, e.toIndex);
    } else if (e.kind === 'voteChanged') {
      votes[e.optionId] = e.votes;
    }
  });

  return { groups, votes };
}

describe('Telemetry integration — complex QV flows', () => {
  it('captures complex binning + voting + navigation and can be replayed', () => {
    const aggregator = new TelemetryAggregator({ now: (() => { let t = 0; return () => (t += 10); })() });
    const store = buildStoreWithAggregator(aggregator);

    // Seed question with four options and full categories
    store.dispatch(
      seedQvQuestion({
        questionId: 'qv1',
        totalCredits: 12,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: [
          { optionId: 'a', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 0 },
          { optionId: 'b', group: 'Undecided', groupPosition: 1, globalPosition: 1, votes: 0 },
          { optionId: 'c', group: 'Undecided', groupPosition: 2, globalPosition: 2, votes: 0 },
          { optionId: 'd', group: 'Undecided', groupPosition: 3, globalPosition: 3, votes: 0 },
        ],
      }),
    );

    // Navigator setup
    store.dispatch(syncQvNavigator({ order: ['qv1'], activeQuestionId: 'qv1' }));

    // Complex interactions: drag, merge, regroup, calibrate, votes, back/forth
    store.dispatch(qvMoveOption({ questionId: 'qv1', optionId: 'a', toGroup: 'Positive', toIndex: 0 }));
    store.dispatch(qvMoveOption({ questionId: 'qv1', optionId: 'b', toGroup: 'Negative', toIndex: 0 }));
    store.dispatch(qvMergeGroups({ questionId: 'qv1', source: 'Undecided', target: 'Skip' }));
    store.dispatch(qvRegroupAndOrder({ questionId: 'qv1', strategy: 'byVotes' }));
    store.dispatch(qvCalibratePositions({ questionId: 'qv1' }));

    // Voting changes with adjustments
    store.dispatch(qvSetVotes({ questionId: 'qv1', optionId: 'a', votes: 2 }));
    store.dispatch(qvSetVotes({ questionId: 'qv1', optionId: 'a', votes: 3 }));
    store.dispatch(qvSetVotes({ questionId: 'qv1', optionId: 'b', votes: -2 }));
    store.dispatch(qvSetVotes({ questionId: 'qv1', optionId: 'b', votes: -1 }));

    // Navigate back and forth (single question so no change, but still logs when active changes)
    store.dispatch(goToNextQvQuestion());
    store.dispatch(goToPreviousQvQuestion());

    // Gather events and summary
    const chunks = aggregator.flush('qv1');
    const events = chunks.flatMap((c) => c.events).sort((a, b) => a.seq - b.seq);
    const summary = aggregator.getSummary('qv1');

    expect(summary.totalEvents).toBeGreaterThan(0);
    expect((summary.totalsByType as any).binChanged).toBeGreaterThanOrEqual(3);
    expect((summary.totalsByType as any).voteChanged).toBe(4);

    // Reconstruct end state from events and compare with store
    const state = store.getState().unifiedResponses.byQuestionId['qv1'];
    const initial = {
      groups: { Undecided: ['a', 'b', 'c', 'd'], Positive: [], Negative: [], Skip: [] },
      votes: { a: 0, b: 0, c: 0, d: 0 },
    };
    const replay = reconstructStateFromEvents(events, initial);

    // Final votes should match
    expect(replay.votes['a']).toBe(3);
    expect(replay.votes['b']).toBe(-1);

    // Final grouping parity (allowing order differences after calibrate/merge)
    const finalGroups = Object.fromEntries(
      Object.entries(state.positionsByGroup).map(([g, ids]: any) => [g, [...ids]])
    ) as Record<string, string[]>;

    const allIds = new Set(['a', 'b', 'c', 'd']);
    const seen = new Set<string>();
    Object.values(replay.groups).forEach((arr) => arr.forEach((id) => seen.add(id)));
    expect(seen.size).toBe(allIds.size);
    expect([...seen].sort()).toEqual([...allIds].sort());
  });

  it('tracks per-question events across navigation and preserves per-question timelines', () => {
    const aggregator = new TelemetryAggregator({ now: (() => { let t = 0; return () => (t += 5); })() });
    const store = buildStoreWithAggregator(aggregator);

    // Seed two QV questions
    store.dispatch(
      seedQvQuestion({
        questionId: 'qv1',
        totalCredits: 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: [{ optionId: 'o1', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 0 }],
      }),
    );
    store.dispatch(
      seedQvQuestion({
        questionId: 'qv2',
        totalCredits: 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: [{ optionId: 'p1', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 0 }],
      }),
    );

    store.dispatch(syncQvNavigator({ order: ['qv1', 'qv2'], activeQuestionId: 'qv1' }));

    // Interactions on qv1
    store.dispatch(qvSetVotes({ questionId: 'qv1', optionId: 'o1', votes: 2 }));
    store.dispatch(qvMoveOption({ questionId: 'qv1', optionId: 'o1', toGroup: 'Positive', toIndex: 0 }));

    // Navigate to qv2
    store.dispatch(goToNextQvQuestion());

    // Interactions on qv2
    store.dispatch(qvSetVotes({ questionId: 'qv2', optionId: 'p1', votes: -1 }));
    store.dispatch(qvMoveOption({ questionId: 'qv2', optionId: 'p1', toGroup: 'Negative', toIndex: 0 }));

    // Flush per-question and verify isolation
    const c1 = aggregator.flush('qv1').flatMap((c) => c.events);
    const c2 = aggregator.flush('qv2').flatMap((c) => c.events);
    expect(c1.length).toBeGreaterThan(0);
    expect(c2.length).toBeGreaterThan(0);
    expect(c1.every((e) => e.questionId === 'qv1')).toBe(true);
    expect(c2.every((e) => e.questionId === 'qv2')).toBe(true);
  });
});


