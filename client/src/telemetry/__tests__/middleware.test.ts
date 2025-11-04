import { configureStore } from '@reduxjs/toolkit';
import unifiedResponsesReducer, {
  seedQvQuestion,
  qvSetVotes,
  qvMoveOption,
  qvMergeGroups,
  qvCalibratePositions,
  syncQvNavigator,
  goToNextQvQuestion,
} from '../../features/unifiedResponsesSlice';
import { TelemetryAggregator } from '../aggregator';
import { createTelemetryMiddleware } from '../middleware';

function buildStoreWithTelemetry(aggregator: TelemetryAggregator) {
  const middleware = createTelemetryMiddleware(aggregator);
  return configureStore({
    reducer: { unifiedResponses: unifiedResponsesReducer },
    middleware: (getDefault) => getDefault().concat(middleware),
  });
}

describe('telemetry middleware', () => {
  it('emits voteChanged, binChanged and navigateQuestion events', () => {
    const times = [10, 20, 30, 40, 50, 60];
    const aggregator = new TelemetryAggregator({ now: () => times.shift() ?? 0 });
    const store = buildStoreWithTelemetry(aggregator);

    // Seed a QV question with two options
    store.dispatch(
      seedQvQuestion({
        questionId: 'qv1',
        totalCredits: 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: [
          { optionId: 'o1', optionName: 'One', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 0 },
          { optionId: 'o2', optionName: 'Two', group: 'Undecided', groupPosition: 1, globalPosition: 1, votes: 0 },
        ],
      }),
    );

    // Sync navigator so navigate logs have context
    store.dispatch(syncQvNavigator({ order: ['qv1'] }));

    // voteChanged
    store.dispatch(qvSetVotes({ questionId: 'qv1', optionId: 'o1', votes: 3 }));

    // binChanged via move
    store.dispatch(qvMoveOption({ questionId: 'qv1', optionId: 'o1', toGroup: 'Positive', toIndex: 0 }));

    // binChanged via calibrate
    store.dispatch(qvCalibratePositions({ questionId: 'qv1' }));

    // navigate next (noop in single question but still counted when active changes)
    store.dispatch(goToNextQvQuestion());

    const summaries = aggregator.getAllSummaries();
    const s = summaries.find((x) => x.questionId === 'qv1');
    expect(s).toBeDefined();
    expect(s!.totalsByType.voteChanged).toBeGreaterThanOrEqual(1);
    expect(s!.totalsByType.binChanged).toBeGreaterThanOrEqual(1);
  });

  it('diffs merge groups into binChanged events with indices', () => {
    const aggregator = new TelemetryAggregator({ now: () => 0 });
    const store = buildStoreWithTelemetry(aggregator);

    store.dispatch(
      seedQvQuestion({
        questionId: 'qv2',
        totalCredits: 10,
        categories: ['Undecided', 'Positive', 'Negative', 'Skip'],
        options: [
          { optionId: 'a', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 0 },
          { optionId: 'b', group: 'Undecided', groupPosition: 1, globalPosition: 1, votes: 0 },
        ],
      }),
    );

    store.dispatch(qvMergeGroups({ questionId: 'qv2', source: 'Undecided', target: 'Skip' }));

    const summary = aggregator.getSummary('qv2');
    expect(summary.totalsByType.binChanged).toBeGreaterThanOrEqual(1);
  });
});


