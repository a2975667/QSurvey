// const eventRecords = [];

const storedEventRecords = localStorage.getItem("eventRecords");
const eventRecords = storedEventRecords ? JSON.parse(storedEventRecords) : [];

export const eventRecorderMiddleware = store => next => action => {
    try {
        action.timestamp = new Date().toISOString();
        eventRecords.push(action);
        localStorage.setItem("eventRecords", JSON.stringify(eventRecords));
        // console.log(eventRecords);
        return next(action);
    } catch (err) {

        throw err;
    }
  };


  