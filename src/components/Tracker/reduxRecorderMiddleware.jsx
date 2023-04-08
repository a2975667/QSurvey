const eventRecords = [];

export const eventRecorderMiddleware = store => next => action => {
    try {
        eventRecords.push(action);
        console.log(eventRecords);
        return next(action);
    } catch (err) {

        throw err;
    }
  };

