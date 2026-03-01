import { deepDiff } from "./deepDiff";
const MAX_QUESTION_EVENTS = 1000;
const MAX_GLOBAL_EVENTS = 1000;
const MAX_QUESTION_BYTES = 512 * 1024;
const MAX_GLOBAL_BYTES = 512 * 1024;

const createEmptyRecords = () => ({
  byQuestionId: {},
  global: [],
});

const persistedRecords = createEmptyRecords();
const activeRecords = createEmptyRecords();

let totalCursorDistance = 0;
let totalMouseClicks = 0;
let recorderPersistenceDisabled = false;
const textInputSessions = {};
let mouseListenersRegistered = false;

const submitBoundaryActions = new Set([
  "options/submitBatchQuestionResponses/pending",
  "options/submitInitialQuestionResponse/pending",
  "options/submitAdditionalQuestionResponse/pending",
  "options/updateQuestionResponse/pending",
  "options/completeSurveyResponse/pending",
]);

const isLegacyRecorderEnabled = () =>
  process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER === "true";

const isStorageDomException = (err) => {
  if (!err) return false;
  const errorName = err?.name;
  return errorName === "QuotaExceededError" || errorName === "SecurityError";
};

const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

let prevX = null;
let prevY = null;
const onMouseMove = (event) => {
  if (prevX !== null && prevY !== null) {
    totalCursorDistance += calculateDistance(prevX, prevY, event.clientX, event.clientY);
  }
  prevX = event.clientX;
  prevY = event.clientY;
};

const onMouseClick = () => {
  totalMouseClicks += 1;
};

const canUseDocument = () =>
  typeof document !== "undefined" &&
  typeof document.addEventListener === "function";

const ensureMouseListenersRegistered = () => {
  if (!canUseDocument() || mouseListenersRegistered) return;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("click", onMouseClick);
  mouseListenersRegistered = true;
};

const unregisterMouseListeners = () => {
  if (!canUseDocument() || !mouseListenersRegistered) return;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("click", onMouseClick);
  mouseListenersRegistered = false;
};

const getSerializedBytes = (value) => {
  try {
    return JSON.stringify(value).length;
  } catch (_) {
    return Number.MAX_SAFE_INTEGER;
  }
};

const getEventTimestampMs = (event) => {
  const ms = Date.parse(event?.timestamp || "");
  return Number.isNaN(ms) ? 0 : ms;
};

const trimGlobalRecords = (records) => {
  while (records.length > MAX_GLOBAL_EVENTS) {
    records.shift();
  }
  while (records.length > 0 && getSerializedBytes(records) > MAX_GLOBAL_BYTES) {
    records.shift();
  }
};

const getQuestionRecordCount = (byQuestionId) =>
  Object.values(byQuestionId).reduce((acc, list) => acc + list.length, 0);

const trimQuestionRecords = (byQuestionId) => {
  let totalEvents = getQuestionRecordCount(byQuestionId);
  while (
    totalEvents > MAX_QUESTION_EVENTS ||
    getSerializedBytes(byQuestionId) > MAX_QUESTION_BYTES
  ) {
    const entries = Object.entries(byQuestionId).filter(([, list]) => list.length > 0);
    if (entries.length === 0) break;

    let oldestQuestionId = entries[0][0];
    let oldestTimestamp = getEventTimestampMs(entries[0][1][0]);
    entries.forEach(([questionId, list]) => {
      const firstTimestamp = getEventTimestampMs(list[0]);
      if (firstTimestamp < oldestTimestamp) {
        oldestTimestamp = firstTimestamp;
        oldestQuestionId = questionId;
      }
    });

    byQuestionId[oldestQuestionId].shift();
    if (byQuestionId[oldestQuestionId].length === 0) {
      delete byQuestionId[oldestQuestionId];
    }
    totalEvents = getQuestionRecordCount(byQuestionId);
  }
};

const appendQuestionEvent = (target, questionId, event) => {
  if (!target.byQuestionId[questionId]) {
    target.byQuestionId[questionId] = [];
  }
  target.byQuestionId[questionId].push(event);
};

const appendGlobalEvent = (target, event) => {
  target.global.push(event);
};

const extractQuestionIdsFromAction = (action) => {
  const questionIds = new Set();
  const candidateSources = [action?.payload, action?.meta?.arg];

  candidateSources.forEach((source) => {
    const questionId = source?.questionId;
    if (typeof questionId === "string" && questionId.length > 0) {
      questionIds.add(questionId);
    }
    const responses = Array.isArray(source?.responses) ? source.responses : [];
    responses.forEach((response) => {
      const responseQuestionId = response?.questionId;
      if (typeof responseQuestionId === "string" && responseQuestionId.length > 0) {
        questionIds.add(responseQuestionId);
      }
    });
  });

  return Array.from(questionIds);
};

const mergeRecordsForPersistence = (questionIdsToFlush) => {
  const flushQuestionIds = Array.from(
    new Set((questionIdsToFlush || []).filter((id) => typeof id === "string" && id.length > 0)),
  );

  flushQuestionIds.forEach((questionId) => {
    const activeQuestionEvents = activeRecords.byQuestionId[questionId] || [];
    if (activeQuestionEvents.length === 0) return;
    if (!persistedRecords.byQuestionId[questionId]) {
      persistedRecords.byQuestionId[questionId] = [];
    }
    persistedRecords.byQuestionId[questionId].push(...activeQuestionEvents);
    delete activeRecords.byQuestionId[questionId];
  });

  if (activeRecords.global.length > 0) {
    persistedRecords.global.push(...activeRecords.global);
    activeRecords.global.length = 0;
  }

  trimQuestionRecords(persistedRecords.byQuestionId);
  trimGlobalRecords(persistedRecords.global);
};

const resetRecorderState = () => {
  persistedRecords.byQuestionId = {};
  persistedRecords.global = [];
  activeRecords.byQuestionId = {};
  activeRecords.global = [];
  totalCursorDistance = 0;
  totalMouseClicks = 0;
  prevX = null;
  prevY = null;
  Object.keys(textInputSessions).forEach((questionId) => {
    delete textInputSessions[questionId];
  });
};

const disableRecorder = (warningMessage) => {
  recorderPersistenceDisabled = true;
  unregisterMouseListeners();
  resetRecorderState();
  if (warningMessage && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(warningMessage);
  }
};

const canUseLocalStorage = () => {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch (_) {
    return false;
  }
};

const persistEventRecords = () => {
  if (!canUseLocalStorage()) {
    disableRecorder(
      "Telemetry middleware: localStorage is unavailable; disabling legacy recorder.",
    );
    return;
  }

  try {
    window.localStorage.setItem("eventRecords", JSON.stringify(persistedRecords));
  } catch (err) {
    const errorName = err?.name || "Error";
    if (isStorageDomException(err)) {
      disableRecorder(
        `Telemetry middleware: ${errorName} while persisting; disabling legacy recorder.`,
      );
      return;
    }
    disableRecorder(
      `Telemetry middleware: unexpected ${errorName} while persisting; disabling legacy recorder.`,
    );
  }
};

const flushTextInputSessions = (actionTime, triggerActionType, questionIdsToFlush = null) => {
  const byQuestionId = {};
  const endTime = actionTime.toISOString();
  const localTime = actionTime.toLocaleTimeString();
  const endMs = actionTime.getTime();
  const questionIdSet = Array.isArray(questionIdsToFlush)
    ? new Set(questionIdsToFlush.filter((id) => typeof id === "string" && id.length > 0))
    : null;

  Object.keys(textInputSessions).forEach((questionId) => {
    if (questionIdSet && !questionIdSet.has(questionId)) return;
    const session = textInputSessions[questionId];
    if (!session) return;

    byQuestionId[questionId] = {
      type: "telemetry/textEnd",
      payload: {
        questionId,
        startTime: session.startTime,
        endTime,
        durationMs: Math.max(0, endMs - session.startMs),
        startLength: session.startLength,
        endLength: session.lastLength,
        triggerActionType,
      },
      timestamp: endTime,
      localTime,
      totalCursorDistance,
      totalMouseClicks,
    };

    delete textInputSessions[questionId];
  });

  return byQuestionId;
};

export const eventRecorderMiddleware = store => next => action => {
  const shouldRecord = isLegacyRecorderEnabled() && !recorderPersistenceDisabled;
  const prevState = shouldRecord ? store.getState() : null;
  const result = next(action);

  if (!shouldRecord) {
    return result;
  }

  ensureMouseListenersRegistered();
  const newState = store.getState();

  try {
    const actionType = action?.type;
    const actionTime = new Date();
    const timestamp = actionTime.toISOString();
    const localTime = actionTime.toLocaleTimeString();
    let shouldPersistSnapshot = false;
    const isSubmitBoundary = submitBoundaryActions.has(actionType);
    const isGlobalSubmitBoundary =
      actionType === "options/completeSurveyResponse/pending";
    const submitQuestionIds = submitBoundaryActions.has(actionType)
      ? extractQuestionIdsFromAction(action)
      : [];

    if (isSubmitBoundary) {
      const scopedQuestionIds = isGlobalSubmitBoundary ? null : submitQuestionIds;
      const textEndEventsByQuestion = flushTextInputSessions(
        actionTime,
        actionType,
        scopedQuestionIds,
      );
      Object.entries(textEndEventsByQuestion).forEach(([questionId, event]) => {
        appendQuestionEvent(activeRecords, questionId, event);
      });
    }

    if (actionType === "unifiedResponses/setTextAnswer") {
      const questionId = action?.payload?.questionId;
      const text = typeof action?.payload?.text === "string" ? action.payload.text : "";
      if (typeof questionId === "string" && questionId.length > 0) {
        if (!textInputSessions[questionId]) {
          textInputSessions[questionId] = {
            startTime: timestamp,
            startMs: actionTime.getTime(),
            startLength: text.length,
            lastLength: text.length,
          };
          appendQuestionEvent(activeRecords, questionId, {
            type: "telemetry/textStart",
            payload: {
              questionId,
              startTime: timestamp,
              startLength: text.length,
            },
            timestamp,
            localTime,
            totalCursorDistance,
            totalMouseClicks,
          });
        } else {
          textInputSessions[questionId].lastLength = text.length;
        }
      }
    } else {
      const telemetryRecord = {
        ...action,
        timestamp,
        localTime,
        totalCursorDistance,
        totalMouseClicks,
        stateDiff: deepDiff(prevState, newState),
      };
      const questionIds = extractQuestionIdsFromAction(action);
      if (questionIds.length > 0) {
        questionIds.forEach((questionId) => {
          appendQuestionEvent(activeRecords, questionId, telemetryRecord);
        });
      } else {
        appendGlobalEvent(activeRecords, telemetryRecord);
      }
    }

    if (isSubmitBoundary) {
      const questionIdsToPersist = isGlobalSubmitBoundary
        ? Object.keys(activeRecords.byQuestionId)
        : submitQuestionIds;
      mergeRecordsForPersistence(questionIdsToPersist);
      shouldPersistSnapshot = true;
    }

    // Persist only when new telemetry records were added.
    if (
      shouldPersistSnapshot &&
      !recorderPersistenceDisabled
    ) {
      persistEventRecords();
    }
  } catch (err) {
    // Telemetry must remain best-effort and never block survey dispatches.
    if (isStorageDomException(err)) {
      disableRecorder(
        `Telemetry middleware: ${err?.name || "StorageError"}; disabling legacy recorder.`,
      );
    } else if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("Telemetry middleware error:", err);
    }
  } finally {
    // Reset interaction counters even when telemetry processing throws.
    totalCursorDistance = 0;
    totalMouseClicks = 0;
  }

  return result;
};

export const __resetLegacyRecorderForTests = () => {
  recorderPersistenceDisabled = false;
  unregisterMouseListeners();
  resetRecorderState();
};
  
