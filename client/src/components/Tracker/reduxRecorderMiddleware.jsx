import { deepDiff } from "./deepDiff";
const eventRecords = [];
let prevState = null;

// // uncomment this if we want to track the user's actions across sessions.
// const storedEventRecords = localStorage.getItem("eventRecords");
// console.log(storedEventRecords);
// const eventRecords = storedEventRecords ? JSON.parse(storedEventRecords) : [];
// Note eventually, these actions should be processed by the server and stored in a database.

let totalCursorDistance = 0;
let totalMouseClicks = 0;

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

export const eventRecorderMiddleware = store => next => action => {
  try {

    let prevState = store.getState();
    const result = next(action);  // Move next action here so state updates
    const newState = store.getState();
    
    // Update the action object with additional information
    let actionTime = new Date();
    action.timestamp = actionTime.toISOString();
    action.localTime = actionTime.toLocaleTimeString();
    action.totalCursorDistance = totalCursorDistance;
    action.totalMouseClicks = totalMouseClicks;
    action.stateDiff = deepDiff(prevState, newState);
    
    // Reset the mouse-related variables
    totalCursorDistance = 0;
    totalMouseClicks = 0;
    
    // Update the eventRecords and save to localStorage
    eventRecords.push(action);
    localStorage.setItem("eventRecords", JSON.stringify(eventRecords));
    
    // Update prevState for the next action
    prevState = newState;
    
    return result;
  } catch (err) {
    throw err;
  }
};
  