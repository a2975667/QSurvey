// const eventRecords = [];

const storedEventRecords = localStorage.getItem("eventRecords");
const eventRecords = storedEventRecords ? JSON.parse(storedEventRecords) : [];

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
        action.timestamp = new Date().toISOString();
        action.totalCursorDistance = totalCursorDistance;
        action.totalMouseClicks = totalMouseClicks;

        totalCursorDistance = 0;
        totalMouseClicks = 0;

        eventRecords.push(action);
        localStorage.setItem("eventRecords", JSON.stringify(eventRecords));
        // console.log(eventRecords);
        return next(action);
    } catch (err) {

        throw err;
    }
  };


  