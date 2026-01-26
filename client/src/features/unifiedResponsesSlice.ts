import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  submitBatchQuestionResponses,
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse,
  fetchSurveyResponseByUUID,
} from './options/api/options.api';
import type {
  UnifiedResponsesState,
  QuestionResponseState,
  QvQuestionState,
  QvOptionState,
  QvBinsConfig,
  QvNavigatorState,
  ApprovalQuestionState,
  ApprovalOptionState,
  ApprovalNavigatorState,
  ApprovalInteractionEvent,
  SelectionQuestionState,
} from '../types/responseTypes';

const DEFAULT_BINS: QvBinsConfig = {
  hasUndecided: true,
  hasSkip: true,
  userDefined: [],
};

const DEFAULT_CATEGORIES = ['Undecided', 'Skip'];

const createEmptyNavigator = (): QvNavigatorState => ({
  order: [],
  activeQuestionId: undefined,
  completed: {},
});

const createEmptyApprovalNavigator = (): ApprovalNavigatorState => ({
  order: [],
  activeQuestionId: undefined,
  completed: {},
});

const createInitialState = (): UnifiedResponsesState => ({
  status: 'idle',
  error: undefined,
  surveyId: undefined,
  surveyResponseId: undefined,
  uuid: undefined,
  questionResponseIds: {},
  byQuestionId: {},
  qvNavigator: createEmptyNavigator(),
  approvalNavigator: createEmptyApprovalNavigator(),
  submitQueue: [],
});

const initialState: UnifiedResponsesState = createInitialState();

function computeCategoriesOrder(bins: QvBinsConfig): string[] {
  const order: string[] = [];
  if (bins.hasUndecided) order.push('Undecided');
  if (bins.userDefined?.length) order.push(...bins.userDefined);
  if (bins.hasSkip) order.push('Skip');
  return order.length ? order : [...DEFAULT_CATEGORIES];
}

function ensurePositionsForCategories(qv: QvQuestionState, categories: string[]) {
  categories.forEach((category) => {
    if (!qv.positionsByGroup[category]) {
      qv.positionsByGroup[category] = [];
    }
  });
}

function reconcileOptionsWithCategories(qv: QvQuestionState, categories: string[]) {
  const allowed = new Set(categories);
  const fallback = categories[0] ?? 'Skip';
  Object.keys(qv.positionsByGroup).forEach((category) => {
    if (!allowed.has(category)) {
      const displaced = qv.positionsByGroup[category] || [];
      displaced.forEach((optionId) => {
        if (!qv.options[optionId]) return;
        qv.options[optionId].group = fallback;
        if (!qv.positionsByGroup[fallback]) qv.positionsByGroup[fallback] = [];
        qv.positionsByGroup[fallback].push(optionId);
      });
      delete qv.positionsByGroup[category];
    }
  });
  ensurePositionsForCategories(qv, categories);
}

function recomputePositions(qv: QvQuestionState) {
  const seen = new Set<string>();
  let globalIndex = 0;

  qv.categoriesOrder.forEach((category) => {
    const list = qv.positionsByGroup[category] || [];
    const filtered: string[] = [];
    list.forEach((optionId) => {
      if (seen.has(optionId)) return;
      if (!qv.options[optionId]) return;
      seen.add(optionId);
      filtered.push(optionId);
    });
    qv.positionsByGroup[category] = filtered;
    filtered.forEach((optionId, idx) => {
      const option = qv.options[optionId];
      option.group = category;
      option.groupPosition = idx;
      option.globalPosition = globalIndex++;
    });
  });

  const fallback = qv.categoriesOrder[0] ?? 'Skip';
  Object.keys(qv.options).forEach((optionId) => {
    if (seen.has(optionId)) return;
    const option = qv.options[optionId];
    if (!qv.positionsByGroup[fallback]) qv.positionsByGroup[fallback] = [];
    option.group = fallback;
    option.groupPosition = qv.positionsByGroup[fallback].length;
    option.globalPosition = globalIndex++;
    qv.positionsByGroup[fallback].push(optionId);
    seen.add(optionId);
  });
}

function ensureQvQuestion(
  state: UnifiedResponsesState,
  questionId: string,
  totalCredits = 0,
  categoriesOrder?: string[],
): QvQuestionState {
  const existing = state.byQuestionId[questionId];
  if (existing && existing.type === 'qv') {
    const qvExisting = existing as QvQuestionState;
    if (typeof totalCredits === 'number' && totalCredits > 0) {
      qvExisting.totalCredits = totalCredits;
    }
    return qvExisting;
  }

  const bins = { ...DEFAULT_BINS };
  const order = categoriesOrder?.length ? categoriesOrder : computeCategoriesOrder(bins);

  const qv: QvQuestionState = {
    type: 'qv',
    questionId,
    totalCredits,
    options: {},
    positionsByGroup: order.reduce((acc, category) => {
      acc[category] = [];
      return acc;
    }, {} as { [group: string]: string[] }),
    categoriesOrder: order,
    bins,
    history: { revision: 0 },
  };

  state.byQuestionId[questionId] = qv;
  return qv;
}

function ensureApprovalQuestion(
  state: UnifiedResponsesState,
  questionId: string,
  options?: ApprovalOptionState[],
  orderOverride?: string[],
): ApprovalQuestionState {
  const existing = state.byQuestionId[questionId];
  const base: ApprovalQuestionState =
    existing && existing.type === 'approval'
      ? (existing as ApprovalQuestionState)
      : {
          type: 'approval',
          questionId,
          approvals: [],
          options: {},
          order: [],
          history: { revision: 0, initialOrder: undefined },
        };

  if (Array.isArray(options)) {
    options.forEach((opt) => {
      if (!opt?.optionId) return;
      base.options[opt.optionId] = {
        optionId: opt.optionId,
        optionName: opt.optionName || base.options[opt.optionId]?.optionName,
        description: opt.description || base.options[opt.optionId]?.description,
      };
    });
  }

  const incomingOrder = normaliseOrder(orderOverride ?? base.order);
  const optionsOrder =
    Array.isArray(options) && options.length
      ? options
          .map((opt) => opt.optionId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
  const nextOrder = incomingOrder.length ? incomingOrder : optionsOrder;
  base.order = normaliseOrder(nextOrder);

  // Drop approvals that no longer correspond to known options when options are available
  if (Object.keys(base.options).length > 0) {
    base.approvals = normaliseOrder(base.approvals).filter((id) => Boolean(base.options[id]));
  } else {
    base.approvals = normaliseOrder(base.approvals);
  }

  if (!base.history?.initialOrder && base.order.length) {
    base.history = {
      ...(base.history || {}),
      initialOrder: [...base.order],
    };
  }

  state.byQuestionId[questionId] = base;
  return base;
}

function recordApprovalEvent(target: ApprovalQuestionState, event: ApprovalInteractionEvent) {
  const history = target.history || {};
  const events = history.events || [];
  events.push(event);
  target.history = {
    ...history,
    events,
    lastEventAt: event.at,
    revision: (history.revision || 0) + 1,
    initialOrder: history.initialOrder || target.order,
  };
}

function filterApprovalList(target: ApprovalQuestionState, approvals: string[]): string[] {
  const normalized = normaliseOrder(approvals);
  const optionIds = Object.keys(target.options);
  if (!optionIds.length) return normalized;
  const allowed = new Set(optionIds);
  return normalized.filter((id) => allowed.has(id));
}

function normaliseOrder(order: string[] = []): string[] {
  return Array.from(new Set(order.filter((id) => typeof id === 'string' && id.length > 0))) as string[];
}

function pickActive(order: string[], preferred?: string | null): string | undefined {
  if (preferred && order.includes(preferred)) {
    return preferred;
  }
  return order[0];
}

function allCompleted(order: string[], completed: { [id: string]: boolean } | undefined): boolean {
  if (!order?.length) return false;
  const comp = completed || {};
  return order.every((id) => !!comp[id]);
}

function computeTerminalActive(
  order: string[],
  completed: { [id: string]: boolean } | undefined,
  preferred?: string | null,
): string | undefined {
  if (!order?.length) return undefined;
  const comp = completed || {};
  if (order.every((id) => !!comp[id])) return undefined;
  if (preferred && order.includes(preferred)) {
    return preferred || undefined;
  }
  const firstIncomplete = order.find((id) => !comp[id]);
  return firstIncomplete || order[0];
}

export const unifiedResponsesSlice = createSlice({
  name: 'unifiedResponses',
  initialState,
  reducers: {
    syncQvNavigator: (
      state,
      action: PayloadAction<{
        order: string[];
        activeQuestionId?: string | null;
        completed?: string[] | { [questionId: string]: boolean };
      }>,
    ) => {
      const order = normaliseOrder(action.payload.order);
      state.qvNavigator.order = order;

      const incomingCompleted = action.payload.completed;
      const nextCompleted: { [questionId: string]: boolean } = {};
      if (Array.isArray(incomingCompleted)) {
        incomingCompleted.forEach((questionId) => {
          if (order.includes(questionId)) {
            nextCompleted[questionId] = true;
          }
        });
      } else if (incomingCompleted && typeof incomingCompleted === 'object') {
        Object.entries(incomingCompleted).forEach(([questionId, value]) => {
          if (order.includes(questionId) && value) {
            nextCompleted[questionId] = true;
          }
        });
      } else {
        Object.entries(state.qvNavigator.completed).forEach(([questionId, value]) => {
          if (order.includes(questionId) && value) {
            nextCompleted[questionId] = true;
          }
        });
      }
      state.qvNavigator.completed = nextCompleted;

      const preferred = action.payload.activeQuestionId ?? state.qvNavigator.activeQuestionId;
      state.qvNavigator.activeQuestionId = computeTerminalActive(order, nextCompleted, preferred);
    },

    setActiveQvQuestion: (state, action: PayloadAction<string | null | undefined>) => {
      const order = state.qvNavigator.order;
      if (!order.length) {
        state.qvNavigator.activeQuestionId = undefined;
        return;
      }
      const candidate = action.payload;
      state.qvNavigator.activeQuestionId = computeTerminalActive(order, state.qvNavigator.completed, candidate);
    },

    goToNextQvQuestion: (state) => {
      const { order, activeQuestionId } = state.qvNavigator;
      if (!order.length) return;
      if (allCompleted(order, state.qvNavigator.completed)) {
        state.qvNavigator.activeQuestionId = undefined;
        return;
      }
      const currentIndex = activeQuestionId ? order.indexOf(activeQuestionId) : -1;
      const nextIndex = currentIndex >= 0 ? Math.min(currentIndex + 1, order.length - 1) : 0;
      const preferred = order[nextIndex];
      state.qvNavigator.activeQuestionId = computeTerminalActive(order, state.qvNavigator.completed, preferred);
    },

    goToPreviousQvQuestion: (state) => {
      const { order, activeQuestionId } = state.qvNavigator;
      if (!order.length) return;
      const currentIndex = activeQuestionId ? order.indexOf(activeQuestionId) : -1;
      const prevIndex = currentIndex >= 0 ? Math.max(currentIndex - 1, 0) : 0;
      state.qvNavigator.activeQuestionId = order[prevIndex];
    },

    markQvQuestionCompleted: (state, action: PayloadAction<string>) => {
      const questionId = action.payload;
      if (state.qvNavigator.order.includes(questionId)) {
        state.qvNavigator.completed[questionId] = true;
        if (allCompleted(state.qvNavigator.order, state.qvNavigator.completed)) {
          state.qvNavigator.activeQuestionId = undefined;
        }
      }
    },

    markQvQuestionIncomplete: (state, action: PayloadAction<string>) => {
      const questionId = action.payload;
      if (state.qvNavigator.completed[questionId]) {
        delete state.qvNavigator.completed[questionId];
      }
      state.qvNavigator.activeQuestionId = computeTerminalActive(
        state.qvNavigator.order,
        state.qvNavigator.completed,
        state.qvNavigator.activeQuestionId,
      );
    },

    syncApprovalNavigator: (
      state,
      action: PayloadAction<{
        order: string[];
        activeQuestionId?: string | null;
        completed?: string[] | { [questionId: string]: boolean };
      }>,
    ) => {
      const order = normaliseOrder(action.payload.order);
      state.approvalNavigator.order = order;

      const incomingCompleted = action.payload.completed;
      const nextCompleted: { [questionId: string]: boolean } = {};
      if (Array.isArray(incomingCompleted)) {
        incomingCompleted.forEach((questionId) => {
          if (order.includes(questionId)) {
            nextCompleted[questionId] = true;
          }
        });
      } else if (incomingCompleted && typeof incomingCompleted === 'object') {
        Object.entries(incomingCompleted).forEach(([questionId, value]) => {
          if (order.includes(questionId) && value) {
            nextCompleted[questionId] = true;
          }
        });
      } else {
        Object.entries(state.approvalNavigator.completed).forEach(([questionId, value]) => {
          if (order.includes(questionId) && value) {
            nextCompleted[questionId] = true;
          }
        });
      }
      state.approvalNavigator.completed = nextCompleted;

      const preferred = action.payload.activeQuestionId ?? state.approvalNavigator.activeQuestionId;
      state.approvalNavigator.activeQuestionId = computeTerminalActive(order, nextCompleted, preferred);
    },

    setActiveApprovalQuestion: (state, action: PayloadAction<string | null | undefined>) => {
      const order = state.approvalNavigator.order;
      if (!order.length) {
        state.approvalNavigator.activeQuestionId = undefined;
        return;
      }
      const candidate = action.payload;
      state.approvalNavigator.activeQuestionId = computeTerminalActive(
        order,
        state.approvalNavigator.completed,
        candidate,
      );
    },

    goToNextApprovalQuestion: (state) => {
      const { order, activeQuestionId } = state.approvalNavigator;
      if (!order.length) return;
      if (allCompleted(order, state.approvalNavigator.completed)) {
        state.approvalNavigator.activeQuestionId = undefined;
        return;
      }
      if (!activeQuestionId) {
        state.approvalNavigator.activeQuestionId = pickActive(order, activeQuestionId);
        return;
      }
      const currentIdx = order.indexOf(activeQuestionId);
      const nextIdx = currentIdx >= 0 ? currentIdx + 1 : 0;
      const nextId = order[nextIdx];
      if (nextId) {
        state.approvalNavigator.activeQuestionId = nextId;
      }
    },

    goToPreviousApprovalQuestion: (state) => {
      const { order, activeQuestionId } = state.approvalNavigator;
      if (!order.length) return;
      if (!activeQuestionId) {
        state.approvalNavigator.activeQuestionId = pickActive(order, activeQuestionId);
        return;
      }
      const currentIdx = order.indexOf(activeQuestionId);
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : 0;
      const prevId = order[prevIdx];
      if (prevId) {
        state.approvalNavigator.activeQuestionId = prevId;
      }
    },

    markApprovalQuestionCompleted: (state, action: PayloadAction<string>) => {
      const questionId = action.payload;
      if (questionId) {
        state.approvalNavigator.completed[questionId] = true;
        if (allCompleted(state.approvalNavigator.order, state.approvalNavigator.completed)) {
          state.approvalNavigator.activeQuestionId = undefined;
        }
      }
    },

    markApprovalQuestionIncomplete: (state, action: PayloadAction<string>) => {
      const questionId = action.payload;
      if (state.approvalNavigator.completed[questionId]) {
        delete state.approvalNavigator.completed[questionId];
      }
      state.approvalNavigator.activeQuestionId = computeTerminalActive(
        state.approvalNavigator.order,
        state.approvalNavigator.completed,
        state.approvalNavigator.activeQuestionId,
      );
    },

    startSurveySession: (
      state,
      action: PayloadAction<{ surveyId: string; surveyResponseId?: string | null; uuid?: string }>,
    ) => {
      state.surveyId = action.payload.surveyId;
      if (action.payload.surveyResponseId !== undefined)
        state.surveyResponseId = action.payload.surveyResponseId;
      if (action.payload.uuid) state.uuid = action.payload.uuid;
      state.status = 'in_progress';
      state.error = undefined;
    },

    setLikertSelection: (
      state,
      action: PayloadAction<{ questionId: string; selection: string; optionName?: string; at?: number }>,
    ) => {
      const { questionId, selection, optionName, at } = action.payload;
      const current = state.byQuestionId[questionId];
      if (!current || current.type !== 'likert') {
        state.byQuestionId[questionId] = {
          type: 'likert',
          questionId,
          selection,
          optionName,
          history: {
            lastEventAt: at || Date.now(),
            changes: [{ from: undefined, to: selection, at: at || Date.now() }],
          },
        };
        return;
      }

      current.selection = selection;
      if (optionName) current.optionName = optionName;
      current.history = current.history || {};
      const timestamp = at || Date.now();
      const changes = current.history.changes || [];
      const previous = changes.length ? changes[changes.length - 1].to : current.selection;
      changes.push({ from: previous, to: selection, at: timestamp });
      current.history.changes = changes;
      current.history.lastEventAt = timestamp;
    },

    setSelectionAnswer: (
      state,
      action: PayloadAction<{ questionId: string; selectedOptionIds: string[]; at?: number }>,
    ) => {
      const { questionId, selectedOptionIds, at } = action.payload;
      const normalized = normaliseOrder(selectedOptionIds);
      const current = state.byQuestionId[questionId];
      if (!current || current.type !== 'selection') {
        const next: SelectionQuestionState = {
          type: 'selection',
          questionId,
          selectedOptionIds: normalized,
          history: {
            lastEventAt: at || Date.now(),
            changes: [{ at: at || Date.now(), selectedOptionIds: normalized }],
          },
        };
        state.byQuestionId[questionId] = next;
        return;
      }

      current.selectedOptionIds = normalized;
      current.history = current.history || {};
      const timestamp = at || Date.now();
      const changes = current.history.changes || [];
      changes.push({ at: timestamp, selectedOptionIds: normalized });
      current.history.changes = changes;
      current.history.lastEventAt = timestamp;
    },

    setTextAnswer: (
      state,
      action: PayloadAction<{ questionId: string; text: string; at?: number }>,
    ) => {
      const { questionId, text, at } = action.payload;
      const current = state.byQuestionId[questionId];
      if (!current || current.type !== 'text') {
        state.byQuestionId[questionId] = {
          type: 'text',
          questionId,
          text,
          history: { lastEventAt: at || Date.now(), length: text.length },
        };
        return;
      }

      current.text = text;
      current.history = current.history || {};
      current.history.lastEventAt = at || Date.now();
      current.history.length = text.length;
    },

    seedApprovalQuestion: (
      state,
      action: PayloadAction<{
        questionId: string;
        options: ApprovalOptionState[];
        order?: string[];
        approvals?: string[];
      }>,
    ) => {
      const { questionId, options, order, approvals } = action.payload;
      const approval = ensureApprovalQuestion(state, questionId, options, order);
      if (approvals) {
        approval.approvals = filterApprovalList(approval, approvals);
      }
    },

    setApprovalSelections: (
      state,
      action: PayloadAction<{ questionId: string; approvals: string[]; at?: number }>,
    ) => {
      const { questionId, approvals, at } = action.payload;
      const approval = ensureApprovalQuestion(state, questionId);
      approval.approvals = filterApprovalList(approval, approvals);
      if (approvals && approvals.length) {
        const timestamp = at || Date.now();
        recordApprovalEvent(approval, {
          type: 'reorder',
          order: [...approval.order],
          at: timestamp,
        });
      }
    },

    toggleApprovalOption: (
      state,
      action: PayloadAction<{ questionId: string; optionId: string; at?: number }>,
    ) => {
      const { questionId, optionId, at } = action.payload;
      const approval = ensureApprovalQuestion(state, questionId);
      if (!approval.options[optionId]) {
        return;
      }
      const isApproved = approval.approvals.includes(optionId);
      approval.approvals = isApproved
        ? approval.approvals.filter((id) => id !== optionId)
        : normaliseOrder([...approval.approvals, optionId]);
      const timestamp = at || Date.now();
      recordApprovalEvent(approval, {
        type: 'toggle',
        optionId,
        action: isApproved ? 'unapprove' : 'approve',
        at: timestamp,
      });
    },

    reorderApprovalOptions: (
      state,
      action: PayloadAction<{ questionId: string; order: string[]; at?: number }>,
    ) => {
      const { questionId, order, at } = action.payload;
      const approval = ensureApprovalQuestion(state, questionId);
      const normalized = filterApprovalList(approval, order);
      const missing = Object.keys(approval.options).filter((id) => !normalized.includes(id));
      approval.order = [...normalized, ...missing];
      const timestamp = at || Date.now();
      recordApprovalEvent(approval, {
        type: 'reorder',
        order: [...approval.order],
        at: timestamp,
      });
    },

    seedQvQuestion: (
      state,
      action: PayloadAction<{
        questionId: string;
        totalCredits: number;
        categories?: string[];
        options: Array<{
          optionId: string;
          optionName?: string;
          group?: string;
          groupPosition?: number;
          votes?: number;
          globalPosition?: number;
        }>;
      }>,
    ) => {
      const { questionId, totalCredits, categories, options } = action.payload;
      const qv = ensureQvQuestion(state, questionId, totalCredits, categories);

      if (categories?.length) {
        qv.categoriesOrder = categories;
        ensurePositionsForCategories(qv, categories);
      } else {
        ensurePositionsForCategories(qv, qv.categoriesOrder);
      }

      options.forEach((optionPayload, idx) => {
        const existing = qv.options[optionPayload.optionId];
        const group = optionPayload.group || existing?.group || qv.categoriesOrder[0] || 'Undecided';
        if (!qv.positionsByGroup[group]) qv.positionsByGroup[group] = [];

        const entry: QvOptionState = {
          optionId: optionPayload.optionId,
          optionName: optionPayload.optionName ?? existing?.optionName,
          group,
          groupPosition:
            optionPayload.groupPosition ?? existing?.groupPosition ?? qv.positionsByGroup[group].length ?? idx,
          globalPosition:
            optionPayload.globalPosition ?? existing?.globalPosition ?? qv.positionsByGroup[group].length ?? idx,
          votes: optionPayload.votes ?? existing?.votes ?? 0,
        };

        qv.options[optionPayload.optionId] = entry;
        if (!qv.positionsByGroup[group].includes(optionPayload.optionId)) {
          qv.positionsByGroup[group].splice(entry.groupPosition, 0, optionPayload.optionId);
        }
      });

      recomputePositions(qv);
      qv.history = { ...(qv.history || {}), revision: (qv.history?.revision || 0) + 1 };
    },

    qvMoveOption: (
      state,
      action: PayloadAction<{ questionId: string; optionId: string; toGroup: string; toIndex: number }>,
    ) => {
      const { questionId, optionId, toGroup, toIndex } = action.payload;
      const qv = state.byQuestionId[questionId] as QvQuestionState | undefined;
      if (!qv || qv.type !== 'qv') return;
      const option = qv.options[optionId];
      if (!option) return;

      const fromGroup = option.group;
      qv.positionsByGroup[fromGroup] = (qv.positionsByGroup[fromGroup] || []).filter((id) => id !== optionId);
      if (!qv.positionsByGroup[toGroup]) qv.positionsByGroup[toGroup] = [];
      const insertionIndex = Math.min(Math.max(toIndex, 0), qv.positionsByGroup[toGroup].length);
      qv.positionsByGroup[toGroup].splice(insertionIndex, 0, optionId);
      option.group = toGroup;

      recomputePositions(qv);
      qv.history = {
        ...(qv.history || {}),
        revision: (qv.history?.revision || 0) + 1,
        lastEventAt: Date.now(),
        lastAction: 'move',
      };
    },

    qvSetVotes: (
      state,
      action: PayloadAction<{ questionId: string; optionId: string; votes: number }>,
    ) => {
      const { questionId, optionId, votes } = action.payload;
      const qv = state.byQuestionId[questionId] as QvQuestionState | undefined;
      if (!qv || qv.type !== 'qv' || !qv.options[optionId]) return;
      qv.options[optionId].votes = votes;
      qv.history = {
        ...(qv.history || {}),
        revision: (qv.history?.revision || 0) + 1,
        lastEventAt: Date.now(),
        lastAction: 'votes',
      };
    },

    qvSetBinsConfig: (
      state,
      action: PayloadAction<{ questionId: string; bins: Partial<QvBinsConfig>; categoriesOrder?: string[] }>,
    ) => {
      const { questionId, bins, categoriesOrder } = action.payload;
      const qv = ensureQvQuestion(state, questionId);

      qv.bins = {
        hasUndecided: bins.hasUndecided ?? qv.bins.hasUndecided,
        hasSkip: bins.hasSkip ?? qv.bins.hasSkip,
        userDefined: bins.userDefined ?? qv.bins.userDefined,
      };

      const nextOrder = categoriesOrder?.length ? categoriesOrder : computeCategoriesOrder(qv.bins);
      qv.categoriesOrder = nextOrder;
      reconcileOptionsWithCategories(qv, nextOrder);
      recomputePositions(qv);
      qv.history = {
        ...(qv.history || {}),
        revision: (qv.history?.revision || 0) + 1,
        lastEventAt: Date.now(),
        lastAction: 'bins:update',
      };
    },

    qvMergeGroups: (
      state,
      action: PayloadAction<{ questionId: string; source: string; target: string }>,
    ) => {
      const { questionId, source, target } = action.payload;
      const qv = state.byQuestionId[questionId] as QvQuestionState | undefined;
      if (!qv || qv.type !== 'qv') return;
      if (source === target) return;

      ensurePositionsForCategories(qv, [source, target]);
      const sourceOptions = [...(qv.positionsByGroup[source] || [])];
      if (!qv.positionsByGroup[target]) qv.positionsByGroup[target] = [];
      sourceOptions.forEach((optionId) => {
        if (!qv.options[optionId]) return;
        qv.positionsByGroup[target].push(optionId);
        qv.options[optionId].group = target;
      });
      qv.positionsByGroup[source] = [];

      recomputePositions(qv);
      qv.history = {
        ...(qv.history || {}),
        revision: (qv.history?.revision || 0) + 1,
        lastEventAt: Date.now(),
        lastAction: 'group:merge',
      };
    },

    qvCalibratePositions: (
      state,
      action: PayloadAction<{ questionId: string }>,
    ) => {
      const { questionId } = action.payload;
      const qv = state.byQuestionId[questionId] as QvQuestionState | undefined;
      if (!qv || qv.type !== 'qv') return;
      ensurePositionsForCategories(qv, qv.categoriesOrder);
      recomputePositions(qv);
      qv.history = {
        ...(qv.history || {}),
        revision: (qv.history?.revision || 0) + 1,
        lastEventAt: Date.now(),
        lastAction: 'calibrate',
      };
    },

    qvRegroupAndOrder: (
      state,
      action: PayloadAction<{ questionId: string; strategy?: 'byVotes' | 'bySign' }>,
    ) => {
      const { questionId, strategy = 'byVotes' } = action.payload;
      const qv = state.byQuestionId[questionId] as QvQuestionState | undefined;
      if (!qv || qv.type !== 'qv') return;

      if (strategy === 'bySign') {
        const order = computeCategoriesOrder(qv.bins);
        reconcileOptionsWithCategories(qv, order);
        const positive = qv.bins.userDefined.find((c) => c.toLowerCase() === 'positive');
        const negative = qv.bins.userDefined.find((c) => c.toLowerCase() === 'negative');
        const neutral = qv.bins.userDefined.find((c) => c.toLowerCase() === 'neutral');
        const undecided = qv.bins.hasUndecided ? 'Undecided' : neutral ?? order[0];
        const skip = qv.bins.hasSkip ? 'Skip' : order[order.length - 1];

        [positive, negative, neutral, undecided, skip].forEach((bucket) => {
          if (bucket) qv.positionsByGroup[bucket] = [];
        });

        Object.values(qv.options).forEach((option) => {
          let targetGroup = option.group;
          if (option.group === undecided && option.votes === 0) {
            targetGroup = undecided;
          } else if (option.votes > 0 && positive) {
            targetGroup = positive;
          } else if (option.votes < 0 && negative) {
            targetGroup = negative;
          } else if (neutral) {
            targetGroup = neutral;
          } else if (qv.bins.hasSkip) {
            targetGroup = skip;
          }

          if (!qv.positionsByGroup[targetGroup]) qv.positionsByGroup[targetGroup] = [];
          qv.positionsByGroup[targetGroup].push(option.optionId);
          option.group = targetGroup;
        });
      } else {
        qv.categoriesOrder.forEach((category) => {
          const entries = qv.positionsByGroup[category] || [];
          entries.sort((a, b) => {
            const optA = qv.options[a];
            const optB = qv.options[b];
            if (!optA || !optB) return 0;
            if (Math.abs(optA.votes) === Math.abs(optB.votes)) {
              if (optA.globalPosition === optB.globalPosition) {
                return optA.optionId.localeCompare(optB.optionId);
              }
              return optA.globalPosition - optB.globalPosition;
            }
            return Math.abs(optB.votes) - Math.abs(optA.votes);
          });
          qv.positionsByGroup[category] = entries;
        });
      }

      recomputePositions(qv);
      qv.history = {
        ...(qv.history || {}),
        revision: (qv.history?.revision || 0) + 1,
        lastEventAt: Date.now(),
        lastAction: 'regroup',
      };
    },

    upsertQuestionResponseFromServer: (
      state,
      action: PayloadAction<{ questionId: string; snapshot: QuestionResponseState }>,
    ) => {
      const { questionId, snapshot } = action.payload;
      state.byQuestionId[questionId] = snapshot;
    },

    recordQuestionResponseId: (
      state,
      action: PayloadAction<{ questionId: string; questionResponseId: string; surveyResponseId?: string }>,
    ) => {
      const { questionId, questionResponseId, surveyResponseId } = action.payload;
      state.questionResponseIds[questionId] = questionResponseId;
      if (surveyResponseId !== undefined) state.surveyResponseId = surveyResponseId;
    },

    enqueueSubmitOp: (
      state,
      action: PayloadAction<{ questionId: string; op: 'create' | 'update'; payloadHash: string; correlationId: string }>,
    ) => {
      state.submitQueue.push({ ...action.payload, createdAt: Date.now(), status: 'pending' });
    },
    markSubmitAck: (state, action: PayloadAction<{ correlationId: string }>) => {
      const pending = state.submitQueue.find((item) => item.correlationId === action.payload.correlationId);
      if (pending) pending.status = 'ack';
    },
    markSubmitError: (state, action: PayloadAction<{ correlationId: string; error: any }>) => {
      const pending = state.submitQueue.find((item) => item.correlationId === action.payload.correlationId);
      if (pending) {
        pending.status = 'error';
        pending.error = action.payload.error;
        state.status = 'error';
        state.error = action.payload.error;
      }
    },

    markSurveyCompleted: (state) => {
      state.status = 'completed';
    },

    resetUnifiedResponses: () => createInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitInitialQuestionResponse.pending, (state) => {
        state.status = 'submitting';
        state.error = undefined;
      })
      .addCase(submitInitialQuestionResponse.fulfilled, (state, action) => {
        state.status = 'in_progress';
        const payload = action.payload || {};
        const surveyResponse = payload.surveyResponse || payload.data?.surveyResponse;
        const questionResponse = payload.questionResponse;

        if (surveyResponse?._id) state.surveyResponseId = surveyResponse._id;
        if (surveyResponse?.uuid) state.uuid = surveyResponse.uuid;

        const questionId = action.meta?.arg?.questionId || questionResponse?.questionId;
        const questionResponseId = questionResponse?._id || payload.questionResponseId;
        if (questionId && questionResponseId) {
          state.questionResponseIds[questionId] = questionResponseId;
        }
      })
      .addCase(submitInitialQuestionResponse.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || action.error;
      })
      .addCase(submitAdditionalQuestionResponse.pending, (state) => {
        state.status = 'submitting';
        state.error = undefined;
      })
      .addCase(submitAdditionalQuestionResponse.fulfilled, (state, action) => {
        state.status = 'in_progress';
        const payload = action.payload || {};
        const questionResponse = payload.questionResponse;
        const questionId =
          action.meta?.arg?.questionId || questionResponse?.questionId;
        const questionResponseId = questionResponse?._id;
        if (questionId && questionResponseId) {
          state.questionResponseIds[questionId] = questionResponseId;
        }
      })
      .addCase(submitAdditionalQuestionResponse.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || action.error;
      })
      .addCase(updateQuestionResponse.pending, (state) => {
        state.status = 'submitting';
        state.error = undefined;
      })
      .addCase(updateQuestionResponse.fulfilled, (state, action) => {
        state.status = 'in_progress';
        const payload = action.payload || {};
        const questionResponse = payload.questionResponse;
        const questionId =
          action.meta?.arg?.questionId || questionResponse?.questionId;
        const questionResponseId = questionResponse?._id;
        if (questionId && questionResponseId) {
          state.questionResponseIds[questionId] = questionResponseId;
        }
      })
      .addCase(updateQuestionResponse.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || action.error;
      })
      .addCase(submitBatchQuestionResponses.pending, (state) => {
        state.status = 'submitting';
        state.error = undefined;
      })
      .addCase(submitBatchQuestionResponses.fulfilled, (state, action) => {
        state.status = 'in_progress';
        const payload = action.payload || {};
        const surveyResponse = payload.surveyResponse;
        const questionResponses = payload.questionResponses;

        if (surveyResponse?._id) state.surveyResponseId = surveyResponse._id;
        if (surveyResponse?.uuid) state.uuid = surveyResponse.uuid;

        if (Array.isArray(questionResponses)) {
          questionResponses.forEach((questionResponse: any) => {
            const questionId =
              typeof questionResponse?.questionId === 'string'
                ? questionResponse.questionId
                : questionResponse?.questionId?.toString?.();
            const questionResponseId =
              typeof questionResponse?._id === 'string'
                ? questionResponse._id
                : questionResponse?._id?.toString?.();
            if (questionId && questionResponseId) {
              state.questionResponseIds[questionId] = questionResponseId;
            }
          });
        }
      })
      .addCase(submitBatchQuestionResponses.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || action.error;
      })
      .addCase(completeSurveyResponse.pending, (state) => {
        state.status = 'submitting';
        state.error = undefined;
      })
      .addCase(completeSurveyResponse.fulfilled, (state) => {
        state.status = 'completed';
      })
      .addCase(completeSurveyResponse.rejected, (state, action) => {
        const payload = (action.payload || {}) as any;
        if (payload?.code === 'DUPLICATE_SUBMISSION') {
          state.status = 'duplicate';
          state.error = payload;
        } else {
          state.status = 'error';
          state.error = action.payload || action.error;
        }
      })
      .addCase(fetchSurveyResponseByUUID.fulfilled, (state, action) => {
        const payload = action.payload as any;
        if (!payload) return;

        const surveyResponseId = payload._id || payload.surveyResponseId;
        if (surveyResponseId) state.surveyResponseId = surveyResponseId;
        if (payload.uuid) state.uuid = payload.uuid;

        const questionResponses = payload.questionResponses || [];
        const candidateNavigators: any[] = [];
        questionResponses.forEach((qr: any) => {
          const questionId =
            typeof qr?.questionId === 'string'
              ? qr.questionId
              : qr?.questionId?._id || qr?.questionId?.toString?.();
          if (!questionId) return;

          const questionResponseId =
            typeof qr?._id === 'string' ? qr._id : qr?._id?.toString?.();
          if (questionResponseId) {
            state.questionResponseIds[questionId] = questionResponseId;
          }

          const content = qr?.responseContent;
          const type = inferResponseType(content);
          if (!type) return;

          if (type === 'likert') {
            state.byQuestionId[questionId] = {
              type: 'likert',
              questionId,
              selection: content.selection,
              optionName: content.optionName,
              history: { lastEventAt: Date.now(), changes: [] },
            };
            return;
          }

          if (type === 'text') {
            state.byQuestionId[questionId] = {
              type: 'text',
              questionId,
              text: content.text,
              history: { lastEventAt: Date.now(), length: content.text?.length ?? 0 },
            };
            return;
          }

          if (type === 'approval') {
            const approvals = Array.isArray(content?.approvals)
              ? content.approvals.filter(
                  (entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0,
                )
              : [];
            const approval = ensureApprovalQuestion(state, questionId);
            approval.approvals = filterApprovalList(approval, approvals);
            approval.history = {
              ...(approval.history || {}),
              lastEventAt: Date.now(),
            };
            return;
          }

          if (type === 'selection') {
            const selections = Array.isArray(content?.selectedOptionIds)
              ? content.selectedOptionIds.filter(
                  (entry: unknown): entry is string =>
                    typeof entry === 'string' && entry.length > 0,
                )
              : [];
            state.byQuestionId[questionId] = {
              type: 'selection',
              questionId,
              selectedOptionIds: normaliseOrder(selections),
              history: { lastEventAt: Date.now(), changes: [] },
            };
            return;
          }

          if (type === 'qv') {
            const qv = ensureQvQuestion(state, questionId);
            const votes = Array.isArray(content.votes) ? content.votes : [];
            const groupsMap = content && typeof content.group === 'object' ? content.group : {};
            const posMap = content && typeof content.position === 'object' ? content.position : {};
            const binsPayload = content && typeof content.bins === 'object' ? content.bins : undefined;
            const categoriesPayload = Array.isArray(content?.categoriesOrder)
              ? (content.categoriesOrder as string[])
              : undefined;

            if (binsPayload) {
              qv.bins = {
                hasUndecided:
                  typeof binsPayload.hasUndecided === 'boolean'
                    ? binsPayload.hasUndecided
                    : qv.bins.hasUndecided,
                hasSkip:
                  typeof binsPayload.hasSkip === 'boolean'
                    ? binsPayload.hasSkip
                    : qv.bins.hasSkip,
                userDefined: Array.isArray(binsPayload.userDefined)
                  ? binsPayload.userDefined.filter(
                      (value: unknown): value is string => typeof value === 'string' && value.length > 0,
                    )
                  : qv.bins.userDefined,
              } as QvBinsConfig;
            }

            let appliedOrder: string[] | undefined;
            if (Array.isArray(categoriesPayload) && categoriesPayload.length) {
              appliedOrder = normaliseOrder(categoriesPayload);
            } else if (binsPayload) {
              appliedOrder = computeCategoriesOrder(qv.bins);
            }

            if (appliedOrder && appliedOrder.length) {
              qv.categoriesOrder = appliedOrder;
            }

            reconcileOptionsWithCategories(qv, qv.categoriesOrder);
            ensurePositionsForCategories(qv, qv.categoriesOrder);

            votes.forEach((vote: any, idx: number) => {
              const optionId = vote?.optionId;
              if (!optionId) return;

              const preferredGroupRaw = groupsMap?.[optionId];
              const preferredGroup =
                typeof preferredGroupRaw === 'string' && qv.categoriesOrder.includes(preferredGroupRaw)
                  ? preferredGroupRaw
                  : qv.categoriesOrder[0] || 'Undecided';

              const initialGlobal = Number.isFinite(posMap?.[optionId]) ? Number(posMap[optionId]) : idx;

              if (!qv.options[optionId]) {
                qv.options[optionId] = {
                  optionId,
                  optionName: vote?.optionName,
                  group: preferredGroup,
                  groupPosition: 0,
                  globalPosition: initialGlobal,
                  votes: vote?.votes ?? 0,
                };
                if (!qv.positionsByGroup[preferredGroup]) qv.positionsByGroup[preferredGroup] = [];
                qv.positionsByGroup[preferredGroup].push(optionId);
              } else {
                qv.options[optionId].votes = vote?.votes ?? 0;
                if (vote?.optionName) qv.options[optionId].optionName = vote.optionName;

                if (preferredGroup && qv.options[optionId].group !== preferredGroup) {
                  const from = qv.options[optionId].group;
                  qv.positionsByGroup[from] = (qv.positionsByGroup[from] || []).filter((id) => id !== optionId);
                  if (!qv.positionsByGroup[preferredGroup]) qv.positionsByGroup[preferredGroup] = [];
                  qv.positionsByGroup[preferredGroup].push(optionId);
                  qv.options[optionId].group = preferredGroup;
                }

                if (Number.isFinite(initialGlobal)) {
                  qv.options[optionId].globalPosition = initialGlobal as number;
                }
              }
            });

            recomputePositions(qv);

            if (content?.navigator && typeof content.navigator === 'object') {
              candidateNavigators.push(content.navigator);
            }
          }
        });

        const topLevelNavigator = payload?.qvNavigator || payload?.navigator;
        const navigatorSnapshot = topLevelNavigator || candidateNavigators.find((nav) => Array.isArray(nav?.order));
        if (navigatorSnapshot && Array.isArray(navigatorSnapshot.order)) {
          const desiredOrder = normaliseOrder(navigatorSnapshot.order as string[]);
          if (desiredOrder.length) {
            state.qvNavigator.order = desiredOrder;

            const incomingCompleted = navigatorSnapshot.completed;
            const completed: { [questionId: string]: boolean } = {};
            if (Array.isArray(incomingCompleted)) {
              incomingCompleted.forEach((questionId: unknown) => {
                if (typeof questionId === 'string' && desiredOrder.includes(questionId)) {
                  completed[questionId] = true;
                }
              });
            } else if (incomingCompleted && typeof incomingCompleted === 'object') {
              Object.entries(incomingCompleted).forEach(([questionId, value]) => {
                if (value && desiredOrder.includes(questionId)) {
                  completed[questionId] = true;
                }
              });
            } else {
              Object.entries(state.qvNavigator.completed || {}).forEach(([questionId, value]) => {
                if (value && desiredOrder.includes(questionId)) {
                  completed[questionId] = true;
                }
              });
            }
            state.qvNavigator.completed = completed;

            const preferredActive = navigatorSnapshot.activeQuestionId;
            if (allCompleted(desiredOrder, completed)) {
              state.qvNavigator.activeQuestionId = undefined;
            } else if (typeof preferredActive === 'string' && desiredOrder.includes(preferredActive)) {
              state.qvNavigator.activeQuestionId = preferredActive;
            } else {
              const firstIncomplete = desiredOrder.find((id) => !completed[id]) ?? desiredOrder[0];
              state.qvNavigator.activeQuestionId = firstIncomplete;
            }
          }
        }

        state.status = 'in_progress';
      });
  },
});

export const {
  syncQvNavigator,
  setActiveQvQuestion,
  goToNextQvQuestion,
  goToPreviousQvQuestion,
  markQvQuestionCompleted,
  markQvQuestionIncomplete,
  syncApprovalNavigator,
  setActiveApprovalQuestion,
  goToNextApprovalQuestion,
  goToPreviousApprovalQuestion,
  markApprovalQuestionCompleted,
  markApprovalQuestionIncomplete,
  startSurveySession,
  setLikertSelection,
  setSelectionAnswer,
  setTextAnswer,
  seedApprovalQuestion,
  setApprovalSelections,
  toggleApprovalOption,
  reorderApprovalOptions,
  seedQvQuestion,
  qvMoveOption,
  qvSetVotes,
  qvSetBinsConfig,
  qvMergeGroups,
  qvCalibratePositions,
  qvRegroupAndOrder,
  upsertQuestionResponseFromServer,
  recordQuestionResponseId,
  enqueueSubmitOp,
  markSubmitAck,
  markSubmitError,
  markSurveyCompleted,
  resetUnifiedResponses,
} = unifiedResponsesSlice.actions;

export default unifiedResponsesSlice.reducer;
function inferResponseType(content: any): 'qv' | 'likert' | 'text' | 'approval' | 'selection' | undefined {
  if (!content || typeof content !== 'object') return undefined;
  if (Array.isArray(content.votes)) return 'qv';
  if (typeof content.selection === 'string') return 'likert';
  if (typeof content.text === 'string') return 'text';
  if (Array.isArray(content.selectedOptionIds)) return 'selection';
  if (Array.isArray(content.approvals)) return 'approval';
  return undefined;
}
