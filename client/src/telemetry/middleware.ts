import { Middleware } from '@reduxjs/toolkit';
import { addTelemetryEvent, TelemetryAggregator } from './aggregator';
import { TelemetryEvent } from './types';
import { UnifiedResponsesState } from '../types/responseTypes';

const now = () => Date.now();

type TelemetryState = {
  metadata?: { surveyId?: string | null };
  unifiedResponses: UnifiedResponsesState;
};

const telemetryCore = (emit: (e: TelemetryEvent) => void): Middleware<{}, TelemetryState> =>
  ({ getState }) => (next) => (action) => {
  const stateBefore = getState();
  const surveyId = (stateBefore as any)?.metadata?.surveyId ?? null;

  // Pre-capture for diffs
  let prevVotes: number | undefined;
  let voteCtx: { questionId?: string; optionId?: string } | undefined;
  if (action?.type === 'unifiedResponses/qvSetVotes' && action?.payload) {
    const { questionId, optionId } = action.payload;
    const qv = (stateBefore as any)?.unifiedResponses?.byQuestionId?.[questionId];
    prevVotes = qv?.options?.[optionId]?.votes;
    voteCtx = { questionId, optionId };
  }

  let prevGroup: string | undefined;
  if (action?.type === 'unifiedResponses/qvMoveOption' && action?.payload) {
    const { questionId, optionId } = action.payload;
    const qv = (stateBefore as any)?.unifiedResponses?.byQuestionId?.[questionId];
    prevGroup = qv?.options?.[optionId]?.group;
  }

  const result = next(action);

  const stateAfter = getState();

  // Map unified actions to telemetry events
  if (action?.type === 'unifiedResponses/qvSetVotes' && action?.payload) {
    const { questionId, optionId, votes } = action.payload;
    const from = prevVotes ?? 0;
    const to = votes ?? 0;
    const e: TelemetryEvent = { t: 'voteChanged', at: now(), surveyId, questionId, optionId, from, to, votes: to } as any;
    emit(e);
  }

  if (action?.type === 'unifiedResponses/qvMergeGroups' && action?.payload) {
    const { questionId, source, target } = action.payload;
    const before = (stateBefore as any)?.unifiedResponses?.byQuestionId?.[questionId];
    const after = (stateAfter as any)?.unifiedResponses?.byQuestionId?.[questionId];
    const beforeList: string[] = before?.positionsByGroup?.[source] || [];
    const afterList: string[] = after?.positionsByGroup?.[target] || [];
    beforeList.forEach((optionId: string) => {
      const toIndex = Math.max(0, afterList.indexOf(optionId));
      const e: TelemetryEvent = {
        t: 'binChanged',
        at: now(),
        surveyId,
        questionId,
        optionId,
        fromGroup: source,
        toGroup: target,
        toIndex,
      } as any;
      emit(e);
    });
  }

  if (action?.type === 'unifiedResponses/qvMoveOption' && action?.payload) {
    const { questionId, optionId, toGroup, toIndex } = action.payload;
    const fromGroup = prevGroup ?? 'Undecided';
    const e: TelemetryEvent = { t: 'binChanged', at: now(), surveyId, questionId, optionId, fromGroup, toGroup, toIndex } as any;
    emit(e);
  }

  if (action?.type === 'unifiedResponses/qvRegroupAndOrder') {
    const { questionId } = action.payload || {};
    emit({ t: 'reorder', at: now(), surveyId, questionId } as any);
  }

  if (action?.type === 'unifiedResponses/goToNextQvQuestion' || action?.type === 'unifiedResponses/goToPreviousQvQuestion' || action?.type === 'unifiedResponses/setActiveQvQuestion') {
    const toQuestionId = (stateAfter as any)?.unifiedResponses?.qvNavigator?.activeQuestionId;
    emit({ t: 'navigateQuestion', at: now(), surveyId, questionId: toQuestionId, toQuestionId } as any);
  }

  // Hover events dispatched explicitly from UI
  if (action?.type === 'telemetry/hoverStart' || action?.type === 'telemetry/hoverEnd') {
    const q = action?.payload?.questionId;
    const e: TelemetryEvent = { t: action.type.endsWith('hoverStart') ? 'hoverStart' : 'hoverEnd', at: now(), surveyId, questionId: q, optionId: action?.payload?.optionId, group: action?.payload?.group, index: action?.payload?.index } as any;
    emit(e);
  }

  return result;
};

// Default middleware used in app store (backs onto global singleton)
const telemetryMiddleware: Middleware<{}, TelemetryState> = telemetryCore(addTelemetryEvent);
export default telemetryMiddleware;

// Test-friendly factory allowing a provided aggregator instance
export const createTelemetryMiddleware = (aggregator: TelemetryAggregator): Middleware<{}, TelemetryState> => {
  const emit = (e: TelemetryEvent) => aggregator.add(e);
  return telemetryCore(emit);
};
