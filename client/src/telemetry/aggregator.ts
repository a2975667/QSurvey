import { TelemetryEvent, TelemetrySummary, TelemetryEventType } from './types';

type Clock = { now: () => number };

// Test-friendly aggregator with per-question summaries
export class TelemetryAggregator {
  private eventsByQuestion: Record<string, any[]> = {};
  private clock: Clock;
  private chunkSize: number;
  private seqByQuestion: Record<string, number> = {};
  private summaryByQuestion: Record<string, any> = {};

  constructor(opts: { now?: () => number; chunkSize?: number } = {}) {
    this.clock = { now: opts.now || (() => Date.now()) };
    this.chunkSize = Math.max(1, opts.chunkSize || 50);
  }

  private normalize(event: any) {
    // Accept either { t: 'voteChanged', ... } or { kind: 'voteChanged', ... }
    const kind = event.t || event.kind;
    const at = typeof event.at === 'number' ? event.at : this.clock.now();
    const questionId = event.questionId;
    const base = { ...event, kind, at, questionId };
    delete (base as any).t; // prefer kind for test APIs
    return base;
  }

  add(event: TelemetryEvent | any) {
    const e = this.normalize(event);
    const qid = e.questionId || 'unknown';
    const nextSeq = (this.seqByQuestion[qid] || 0) + 1;
    this.seqByQuestion[qid] = nextSeq;
    e.seq = nextSeq;
    if (!this.eventsByQuestion[qid]) this.eventsByQuestion[qid] = [];
    this.eventsByQuestion[qid].push(e);

    // Update summaries incrementally to keep counts even after flush
    const s = (this.summaryByQuestion[qid] = this.summaryByQuestion[qid] || this.emptySummary());
    s.totalEvents = (s.totalEvents || 0) + 1;
    s.lastEventTime = typeof e.at === 'number' ? Math.max(s.lastEventTime || 0, e.at) : s.lastEventTime;
    s.lastSeq = Math.max(s.lastSeq || 0, nextSeq);
    const typeKey = (e.kind || e.t) as TelemetryEventType;
    if (typeKey && s.totalsByType[typeKey] !== undefined) {
      s.totalsByType[typeKey] += 1;
    }
    // Dwell accumulation
    if (typeKey === 'hoverStart' && e.optionId) {
      s.__hoverStart = s.__hoverStart || {};
      s.__hoverStart[e.optionId] = e.at;
    }
    if (typeKey === 'hoverEnd' && e.optionId) {
      const start = s.__hoverStart?.[e.optionId];
      if (typeof start === 'number' && typeof e.at === 'number') {
        s.dwellByOption[e.optionId] = (s.dwellByOption[e.optionId] || 0) + Math.max(0, e.at - start);
      }
      if (s.__hoverStart) delete s.__hoverStart[e.optionId];
    }
  }

  // Test API
  log(event: any) {
    this.add(event);
  }

  reset() {
    this.eventsByQuestion = {};
    this.seqByQuestion = {};
    this.summaryByQuestion = {};
  }

  private emptySummary() {
    return {
      totalEvents: 0,
      lastEventTime: undefined as number | undefined,
      lastSeq: undefined as number | undefined,
      totalsByType: {
        voteChanged: 0,
        binChanged: 0,
        navigateQuestion: 0,
        hoverStart: 0,
        hoverEnd: 0,
        reorder: 0,
      } as Record<TelemetryEventType, number>,
      dwellByOption: {} as Record<string, number>,
      byType: undefined as any, // maintained for backward compatibility mapping below
      __hoverStart: undefined as any,
    };
  }

  private summaryFor(events: any[]): TelemetrySummary & { lastSeq?: number; dwellByOption?: Record<string, number>; totalsByType: Record<TelemetryEventType, number> } {
    const byType: Record<TelemetryEventType, number> = {
      voteChanged: 0,
      binChanged: 0,
      navigateQuestion: 0,
      hoverStart: 0,
      hoverEnd: 0,
      reorder: 0,
    };
    let lastEventTime: number | undefined = undefined;
    let lastSeq: number | undefined = undefined;
    const hoverStartByOption: Record<string, number> = {};
    const dwellByOption: Record<string, number> = {};
    for (const e of events) {
      const k = (e.kind || e.t) as TelemetryEventType;
      if (k && (byType as any)[k] !== undefined) byType[k] = (byType[k] ?? 0) + 1;
      if (typeof e.at === 'number') {
        lastEventTime = Math.max(lastEventTime ?? 0, e.at);
      }
      if (typeof e.seq === 'number') lastSeq = Math.max(lastSeq ?? 0, e.seq);
      if (k === 'hoverStart' && e.optionId) hoverStartByOption[e.optionId] = e.at;
      if (k === 'hoverEnd' && e.optionId && typeof hoverStartByOption[e.optionId] === 'number') {
        dwellByOption[e.optionId] = (dwellByOption[e.optionId] || 0) + Math.max(0, e.at - hoverStartByOption[e.optionId]);
        delete hoverStartByOption[e.optionId];
      }
    }
    return {
      totalEvents: events.length,
      lastEventTime,
      lastEventAt: lastEventTime,
      byType, // keep original key for any legacy reads
      totalsByType: byType,
      lastSeq,
      dwellByOption,
    } as any;
  }

  getSummary(questionId: string) {
    const s = this.summaryByQuestion[questionId];
    if (s) {
      // ensure both keys exist
      s.byType = s.totalsByType;
      s.lastEventAt = s.lastEventTime;
      return { questionId, ...s } as any;
    }
    const filtered = (this.eventsByQuestion[questionId] || []).slice();
    return { questionId, ...this.summaryFor(filtered) } as any;
  }

  getAllSummaries() {
    const keys = new Set<string>([
      ...Object.keys(this.summaryByQuestion),
      ...Object.keys(this.eventsByQuestion),
    ]);
    return Array.from(keys).map((qid) => this.getSummary(qid));
  }

  summary(): TelemetrySummary {
    // Merge from summaries map
    const agg = this.emptySummary();
    Object.values(this.summaryByQuestion).forEach((s: any) => {
      agg.totalEvents += s.totalEvents || 0;
      agg.lastEventTime = Math.max(agg.lastEventTime || 0, s.lastEventTime || 0);
      Object.keys(agg.totalsByType).forEach((k) => {
        agg.totalsByType[k as TelemetryEventType] += s.totalsByType?.[k] || 0;
      });
      Object.entries(s.dwellByOption || {}).forEach(([k, v]) => {
        agg.dwellByOption[k] = (agg.dwellByOption[k] || 0) + (v as number);
      });
    });
    agg.byType = agg.totalsByType;
    return agg as any;
  }

  takeReadyChunks() {
    const chunks: Array<{ questionId: string; events: any[] }> = [];
    for (const qid of Object.keys(this.eventsByQuestion)) {
      const buf = this.eventsByQuestion[qid];
      if (buf.length >= this.chunkSize) {
        const events = buf.splice(0, this.chunkSize);
        chunks.push({ questionId: qid, events });
      }
    }
    return chunks;
  }

  flush(questionId: string) {
    const buf = this.eventsByQuestion[questionId] || [];
    if (!buf.length) return [] as Array<{ questionId: string; events: any[] }>;
    const events = buf.splice(0, buf.length);
    return [{ questionId, events }];
  }
}

// App-wide singleton used in production code
const globalAgg = new TelemetryAggregator();

export const addTelemetryEvent = (event: TelemetryEvent) => globalAgg.add(event);
export const getTelemetrySummaryAndReset = (): TelemetrySummary => {
  const s = globalAgg.summary();
  globalAgg.reset();
  return s;
};
export const __telemetryTestOnly = {
  reset: () => globalAgg.reset(),
  summary: () => globalAgg.summary(),
};
