import { configureStore, createSlice } from '@reduxjs/toolkit';
import {
  __resetLegacyRecorderForTests,
  eventRecorderMiddleware,
} from '../reduxRecorderMiddleware';

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
  const recorderFlagEnv = process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER;
  const getLastPersistedSnapshot = (setItemSpy: jest.SpyInstance) => {
    const lastSetItemCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1];
    return JSON.parse(lastSetItemCall[1] as string);
  };

  const getQuestionSubmitPendingAction = (questionId: string) => ({
    type: 'options/submitInitialQuestionResponse/pending',
    meta: { arg: { questionId } },
  });

  const getBatchSubmitPendingAction = (questionIds: string[]) => ({
    type: 'options/submitBatchQuestionResponses/pending',
    meta: {
      arg: { responses: questionIds.map((questionId) => ({ questionId })) },
    },
  });

  beforeEach(() => {
    process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER = 'true';
    __resetLegacyRecorderForTests();
  });

  afterEach(() => {
    if (typeof recorderFlagEnv === 'undefined') {
      delete process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER;
    } else {
      process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER = recorderFlagEnv;
    }
    jest.restoreAllMocks();
    __resetLegacyRecorderForTests();
  });

  it('captures telemetry when recorder is enabled and storage is available', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    store.dispatch(submitSlice.actions.submitRequested());
    store.dispatch({ type: 'options/completeSurveyResponse/pending' });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const persistedSnapshot = getLastPersistedSnapshot(setItemSpy);
    expect(persistedSnapshot.byQuestionId).toEqual({});
    expect(persistedSnapshot.global.map((event: any) => event.type)).toEqual([
      'submit/submitRequested',
      'options/completeSurveyResponse/pending',
    ]);
  });

  it('does not block submit dispatch when localStorage setItem throws QuotaExceededError', () => {

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();
    expect(() => store.dispatch({ type: 'options/completeSurveyResponse/pending' })).not.toThrow();
    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();
    expect(store.getState().submit.dispatchCount).toBe(2);
    expect(localStorage.setItem).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('disables recorder after storage SecurityError so telemetry is no longer captured', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();
    expect(() => store.dispatch({ type: 'options/completeSurveyResponse/pending' })).not.toThrow();
    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();

    expect(store.getState().submit.dispatchCount).toBe(2);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it('disables recorder after unexpected persistence error so telemetry is no longer captured', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        const err = new Error('boom');
        err.name = 'UnexpectedPersistError';
        throw err;
      });

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();
    expect(() => store.dispatch({ type: 'options/completeSurveyResponse/pending' })).not.toThrow();
    expect(() => store.dispatch(submitSlice.actions.submitRequested())).not.toThrow();

    expect(store.getState().submit.dispatchCount).toBe(2);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it('records text telemetry as start/end only instead of per-keystroke events', () => {
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
    store.dispatch(getBatchSubmitPendingAction(['text-q1']));

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const persistedSnapshot = getLastPersistedSnapshot(setItemSpy);
    const q1Events = persistedSnapshot.byQuestionId['text-q1'] || [];

    const startEvents = q1Events.filter(
      (event: any) => event.type === 'telemetry/textStart',
    );
    const endEvents = q1Events.filter(
      (event: any) => event.type === 'telemetry/textEnd',
    );
    const textAnswerEvents = q1Events.filter(
      (event: any) => event.type === 'unifiedResponses/setTextAnswer',
    );

    expect(startEvents).toHaveLength(1);
    expect(endEvents).toHaveLength(1);
    expect(textAnswerEvents).toHaveLength(0);
    expect(endEvents[0].payload.questionId).toBe('text-q1');
    expect(endEvents[0].payload.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('does not persist telemetry when legacy recorder env flag is disabled', () => {
    process.env.REACT_APP_ENABLE_LEGACY_EVENT_RECORDER = 'false';

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
    store.dispatch(getBatchSubmitPendingAction(['text-q1']));

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('flushes only submitted question telemetry at per-question boundary', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    store.dispatch({
      type: 'unifiedResponses/setTextAnswer',
      payload: { questionId: 'q1', text: 'alpha' },
    });
    store.dispatch({
      type: 'unifiedResponses/setTextAnswer',
      payload: { questionId: 'q2', text: 'beta' },
    });

    store.dispatch(getQuestionSubmitPendingAction('q1'));
    const firstSnapshot = getLastPersistedSnapshot(setItemSpy);
    expect(firstSnapshot.byQuestionId.q1).toBeDefined();
    expect(firstSnapshot.byQuestionId.q2).toBeUndefined();

    store.dispatch(getQuestionSubmitPendingAction('q2'));
    const secondSnapshot = getLastPersistedSnapshot(setItemSpy);
    expect(secondSnapshot.byQuestionId.q1).toBeDefined();
    expect(secondSnapshot.byQuestionId.q2).toBeDefined();
  });

  it('enforces question event cap at flush time', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    for (let i = 0; i < 1100; i += 1) {
      store.dispatch({
        type: 'custom/questionEvent',
        payload: { questionId: 'q-cap', seq: i },
      });
    }
    store.dispatch(getQuestionSubmitPendingAction('q-cap'));

    const snapshot = getLastPersistedSnapshot(setItemSpy);
    const cappedEvents = snapshot.byQuestionId['q-cap'] || [];
    expect(cappedEvents.length).toBeLessThanOrEqual(1000);
  });

  it('enforces global byte cap at flush time', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => undefined);

    const store = configureStore({
      reducer: { submit: submitSlice.reducer },
      middleware: (getDefault) => getDefault().concat(eventRecorderMiddleware),
    });

    for (let i = 0; i < 60; i += 1) {
      store.dispatch({
        type: 'custom/globalEvent',
        payload: { blob: 'x'.repeat(15000), seq: i },
      });
    }
    store.dispatch({ type: 'options/completeSurveyResponse/pending' });

    const snapshot = getLastPersistedSnapshot(setItemSpy);
    const serializedGlobalLength = JSON.stringify(snapshot.global).length;
    expect(serializedGlobalLength).toBeLessThanOrEqual(512 * 1024);
  });
});
