import { configureStore, createSlice } from '@reduxjs/toolkit';

const submitSlice = createSlice({
  name: 'submit',
  initialState: { dispatchCount: 0 },
  reducers: {
    submitRequested: (state) => {
      state.dispatchCount += 1;
    },
  },
});

describe('eventRecorderMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('does not block submit dispatch when localStorage setItem throws QuotaExceededError', () => {
    const { eventRecorderMiddleware } = require('../reduxRecorderMiddleware');

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();
    expect(store.getState().submit.dispatchCount).toBe(1);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('records text telemetry as start/end only instead of per-keystroke events', () => {
    const { eventRecorderMiddleware } = require('../reduxRecorderMiddleware');

    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    store.dispatch({
      type: 'unifiedResponses/setTextAnswer',
      payload: { questionId: 'text-q1', text: 'a' },
    });
    store.dispatch({
      type: 'unifiedResponses/setTextAnswer',
      payload: { questionId: 'text-q1', text: 'ab' },
    });
    store.dispatch({
      type: 'unifiedResponses/setTextAnswer',
      payload: { questionId: 'text-q1', text: 'abc' },
    });
    store.dispatch({ type: 'options/submitBatchQuestionResponses/pending' });

    expect(setItemSpy).toHaveBeenCalledTimes(2);

    const lastSetItemCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1];
    const persistedPayload = JSON.parse(lastSetItemCall[1] as string);

    const startEvents = persistedPayload.filter(
      (event: any) => event.type === 'telemetry/textStart',
    );
    const endEvents = persistedPayload.filter(
      (event: any) => event.type === 'telemetry/textEnd',
    );
    const textAnswerEvents = persistedPayload.filter(
      (event: any) => event.type === 'unifiedResponses/setTextAnswer',
    );

    expect(startEvents).toHaveLength(1);
    expect(endEvents).toHaveLength(1);
    expect(textAnswerEvents).toHaveLength(0);
    expect(endEvents[0].payload.questionId).toBe('text-q1');
    expect(endEvents[0].payload.durationMs).toBeGreaterThanOrEqual(0);
  });
});
