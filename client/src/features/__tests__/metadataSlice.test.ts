describe('metadataSlice timestamps', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes startTime from the current unix timestamp', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_123_999);

    let state: any;
    jest.isolateModules(() => {
      const metadataSlice = require('../metadataSlice').default;
      state = metadataSlice.reducer(undefined, { type: '@@INIT' });
    });

    expect(state.startTime).toBe(1_700_000_123);
  });

  it('updates startTime when setMetadataFromSurvey is dispatched', () => {
    const { default: metadataSlice, setMetadataFromSurvey } = require('../metadataSlice');
    const state = metadataSlice.reducer(undefined, { type: '@@INIT' });
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_456_321);

    const nextState = metadataSlice.reducer(
      state,
      setMetadataFromSurvey({ _id: 'survey-1', settings: { isAvailable: true } } as any),
    );

    expect(nextState.startTime).toBe(1_700_000_456);
  });

  it('updates startTime when fetchMetaData is fulfilled', () => {
    const { default: metadataSlice, fetchMetaData } = require('../metadataSlice');
    const state = metadataSlice.reducer(undefined, { type: '@@INIT' });
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_789_654);

    const nextState = metadataSlice.reducer(
      state,
      fetchMetaData.fulfilled(
        { _id: 'survey-1', settings: { isAvailable: true } } as any,
        'request-1',
        'survey-1',
      ),
    );

    expect(nextState.startTime).toBe(1_700_000_789);
  });

  it('keeps missing respondent-results visibility backward compatible', () => {
    const { default: metadataSlice, setMetadataFromSurvey } = require('../metadataSlice');
    const state = metadataSlice.reducer(undefined, { type: '@@INIT' });

    const nextState = metadataSlice.reducer(
      state,
      setMetadataFromSurvey({ _id: 'survey-1', settings: { isAvailable: true } } as any),
    );

    expect(nextState.respondentsCanViewResults).toBe(true);
  });

  it('stores explicit respondent-results visibility from fetched metadata', () => {
    const { default: metadataSlice, fetchMetaData } = require('../metadataSlice');
    const state = metadataSlice.reducer(undefined, { type: '@@INIT' });

    const nextState = metadataSlice.reducer(
      state,
      fetchMetaData.fulfilled(
        {
          _id: 'survey-1',
          settings: {
            isAvailable: true,
            respondentsCanViewResults: false,
          },
        } as any,
        'request-1',
        'survey-1',
      ),
    );

    expect(nextState.respondentsCanViewResults).toBe(false);
  });
});
