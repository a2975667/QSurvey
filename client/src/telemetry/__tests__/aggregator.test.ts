import { TelemetryAggregator } from '../aggregator';

describe('TelemetryAggregator', () => {
  it('chunks events per question and updates summary totals', () => {
    const timestamps = [10, 25, 40];
    const aggregator = new TelemetryAggregator({ chunkSize: 2, now: () => timestamps.shift() ?? 0 });

    aggregator.log({
      kind: 'voteChanged',
      questionId: 'q1',
      optionId: 'o1',
      votes: 3,
      previousVotes: 0,
    });

    expect(aggregator.takeReadyChunks()).toHaveLength(0);

    aggregator.log({
      kind: 'voteChanged',
      questionId: 'q1',
      optionId: 'o2',
      votes: -1,
      previousVotes: 2,
    });

    const chunks = aggregator.takeReadyChunks();
    expect(chunks).toHaveLength(1);
    expect(chunks[0].questionId).toBe('q1');
    expect(chunks[0].events).toHaveLength(2);
    expect(chunks[0].events.map((event) => event.seq)).toEqual([1, 2]);

    const summary = aggregator.getSummary('q1');
    expect(summary.totalEvents).toBe(2);
    expect(summary.totalsByType.voteChanged).toBe(2);
    expect(summary.lastSeq).toBe(2);
    expect(summary.lastEventAt).toBe(25);
  });

  it('accumulates dwell time for hover sessions', () => {
    const timestamps = [100, 180];
    const aggregator = new TelemetryAggregator({ now: () => timestamps.shift() ?? 0 });

    aggregator.log({ kind: 'hoverStart', questionId: 'q2', optionId: 'opt-a' });
    aggregator.log({ kind: 'hoverEnd', questionId: 'q2', optionId: 'opt-a' });

    const summary = aggregator.getSummary('q2');
    expect(summary.totalEvents).toBe(2);
    expect(summary.totalsByType.hoverStart).toBe(1);
    expect(summary.totalsByType.hoverEnd).toBe(1);
    expect(summary.dwellByOption['opt-a']).toBe(80);
  });

  it('flushes pending events without losing summaries', () => {
    const aggregator = new TelemetryAggregator({ chunkSize: 5, now: () => 0 });
    aggregator.log({ kind: 'voteChanged', questionId: 'q3', optionId: 'o1', votes: 1, previousVotes: 0 });
    aggregator.log({ kind: 'binChanged', questionId: 'q3', optionId: 'o1', fromGroup: 'A', toGroup: 'B' });

    const flushed = aggregator.flush('q3');
    expect(flushed).toHaveLength(1);
    expect(flushed[0].events).toHaveLength(2);
    expect(aggregator.takeReadyChunks()).toHaveLength(0);

    const summary = aggregator.getSummary('q3');
    expect(summary.totalEvents).toBe(2);
    expect(summary.totalsByType.voteChanged).toBe(1);
    expect(summary.totalsByType.binChanged).toBe(1);
  });
});
