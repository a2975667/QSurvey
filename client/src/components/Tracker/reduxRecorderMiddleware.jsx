import { deepDiff } from "./deepDiff";
const eventRecords = [];

// // uncomment this if we want to track the user's actions across sessions.
// const storedEventRecords = localStorage.getItem("eventRecords");
// console.log(storedEventRecords);
// const eventRecords = storedEventRecords ? JSON.parse(storedEventRecords) : [];
// Note eventually, these actions should be processed by the server and stored in a database.

let totalCursorDistance = 0;
let totalMouseClicks = 0;
let recorderPersistenceDisabled = false;
const textInputSessions = {};

const submitBoundaryActions = new Set([
  "options/submitBatchQuestionResponses/pending",
  "options/submitInitialQuestionResponse/pending",
  "options/submitAdditionalQuestionResponse/pending",
  "options/updateQuestionResponse/pending",
  "options/completeSurveyResponse/pending",
]);

const shouldPersistEventRecords =
  process.env.NODE_ENV !== "production" ||
  process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER === "true";

const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

let prevX = null;
let prevY = null;
document.addEventListener("mousemove", (event) => {
  if (prevX !== null && prevY !== null) {
    totalCursorDistance += calculateDistance(prevX, prevY, event.clientX, event.clientY);
  }
  prevX = event.clientX;
  prevY = event.clientY;
});

document.addEventListener("click", () => {
  totalMouseClicks += 1;
});

const flushTextInputSessions = (actionTime, triggerActionType) => {
  const events = [];
  const endTime = actionTime.toISOString();
  const localTime = actionTime.toLocaleTimeString();
  const endMs = actionTime.getTime();

  Object.keys(textInputSessions).forEach((questionId) => {
    const session = textInputSessions[questionId];
    if (!session) return;

    events.push({
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
    });

    delete textInputSessions[questionId];
  });

  return events;
};

export const eventRecorderMiddleware = store => next => action => {
  const prevState = store.getState();
  const result = next(action);
  const newState = store.getState();

  try {
    const actionType = action?.type;
    const actionTime = new Date();
    const timestamp = actionTime.toISOString();
    const localTime = actionTime.toLocaleTimeString();
    let shouldPersistSnapshot = false;

    if (submitBoundaryActions.has(actionType)) {
      const textEndEvents = flushTextInputSessions(actionTime, actionType);
      if (textEndEvents.length > 0) {
        eventRecords.push(...textEndEvents);
        shouldPersistSnapshot = true;
      }
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
          eventRecords.push({
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
          shouldPersistSnapshot = true;
        } else {
          textInputSessions[questionId].lastLength = text.length;
        }
      }
    } else {
      // Update the action object with additional information
      action.timestamp = timestamp;
      action.localTime = localTime;
      action.totalCursorDistance = totalCursorDistance;
      action.totalMouseClicks = totalMouseClicks;
      action.stateDiff = deepDiff(prevState, newState);

      eventRecords.push(action);
      shouldPersistSnapshot = true;
    }

    // Reset the mouse-related variables
    totalCursorDistance = 0;
    totalMouseClicks = 0;

    // Persist only when new telemetry records were added.
    if (
      shouldPersistSnapshot &&
      shouldPersistEventRecords &&
      !recorderPersistenceDisabled
    ) {
      localStorage.setItem("eventRecords", JSON.stringify(eventRecords));
    }
  } catch (err) {
    // Telemetry must remain best-effort and never block survey dispatches.
    if (err?.name === "QuotaExceededError") {
      recorderPersistenceDisabled = true;
    }
  }

  return result;
};
  
