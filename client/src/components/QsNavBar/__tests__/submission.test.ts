function setupMocks() {
  jest.resetModules();
  jest.doMock('../../../features/qsOptionsSlice', () => {
    return {
      submitInitialQuestionResponse: jest.fn((payload) => ({
        type: 'options/submitInitialQuestionResponse/fulfilled',
        payload: { surveyResponse: { _id: 'resp-initial', uuid: 'uuid-initial' } },
        meta: { arg: payload },
      })),
      submitAdditionalQuestionResponse: jest.fn((payload) => ({
        type: 'options/submitAdditionalQuestionResponse/fulfilled',
        payload: { questionResponse: { _id: 'qr-additional' } },
        meta: { arg: payload },
      })),
      updateQuestionResponse: jest.fn((payload) => ({
        type: 'options/updateQuestionResponse/fulfilled',
        payload: { questionResponse: { _id: payload.questionResponseId } },
        meta: { arg: payload },
      })),
      completeSurveyResponse: jest.fn((payload) => ({
        type: 'options/completeSurveyResponse/fulfilled',
        payload: {},
        meta: { arg: payload },
      })),
      fetchSurveyResponseByUUID: jest.fn(),
    };
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const actions = require('../../../features/qsOptionsSlice');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const submission = require('../submission');
  return { actions, submission };
}

describe('submission pipeline', () => {
  const optionList = {
    a: { optionId: 'a', optionName: 'Alpha', description: '', questionId: 'qv1', group: 'Undecided', votes: 2, position: 0, groupPosition: 0 },
    b: { optionId: 'b', optionName: 'Beta', description: '', questionId: 'qv1', group: 'Positive', votes: -1, position: 1, groupPosition: 0 },
    c: { optionId: 'c', optionName: 'Gamma', description: '', questionId: 'qv1', group: 'Skip', votes: 0, position: 2, groupPosition: 0 },
  } as any;

  const questions = {
    byId: { qv1: { questionId: 'qv1', type: 'qv', position: 0 } },
  } as any;

  const metadata = { surveyId: 'survey-1' } as any;

  const baseState = {
    qsOptions: { categorySequence: { currentViewCategories: ['Undecided', 'Positive', 'Negative', 'Skip'] } },
  } as any;

  beforeEach(() => {
    // Reset mocks and localStorage before each run
    jest.resetAllMocks();
    try {
      localStorage.clear();
    } catch {}
  });

  it('builds QV response content deterministically', () => {
    const { submission } = setupMocks();
    const content = submission.prepareQVResponse(optionList);
    expect(Object.keys(content.position)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(content.group['a']).toBeDefined();
    // votes are present and include option ids
    expect(content.votes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ optionId: 'a', votes: 2 }),
        expect.objectContaining({ optionId: 'b', votes: -1 }),
        expect.objectContaining({ optionId: 'c', votes: 0 }),
      ]),
    );
  });

  it('extracts behavioral metadata and trims for completion', () => {
    const now = new Date().toISOString();
    const events = [
      { type: 'hover', optionId: 'a', timestamp: now },
      { type: 'vote', optionId: 'b', timestamp: now },
    ];
    try {
      localStorage.setItem('eventRecords', JSON.stringify(events));
    } catch {}

    const { submission } = setupMocks();
    const { stateMetadata, eventRecords, ...rest } = submission.extractBehavioralMetadata(
      optionList,
      5,
      10,
      5,
      baseState.qsOptions.categorySequence.currentViewCategories,
    );
    expect(stateMetadata.finalVotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ optionId: 'a', votes: 2 }),
        expect.objectContaining({ optionId: 'b', votes: -1 }),
      ]),
    );
    expect(eventRecords?.length).toBe(2);
    expect(rest).toBeDefined();
  });

  it('submits new response then completes survey (happy path)', async () => {
    const { actions, submission } = setupMocks();
    const dispatch = jest.fn((action) => action);
    const navigate = jest.fn();
    const setIsSubmitting = jest.fn();
    const setError = jest.fn();

    await submission.submitSurvey({
      optionList,
      remainingCredit: 5,
      totalCredits: 10,
      currCost: 5,
      state: baseState,
      questions,
      metadata,
      qsOptions: { responseStatus: { submitted: false, surveyResponseId: null, questionResponseIds: {} } },
      dispatch: dispatch as any,
      navigate,
      id: 'survey-1',
      setIsSubmitting,
      setError,
    });

    // Ensure initial create then complete are invoked
    expect(actions.submitInitialQuestionResponse).toHaveBeenCalled();
    expect(actions.completeSurveyResponse).toHaveBeenCalled();

    // Check response content passed into initial submit
    const initialArg = (actions.submitInitialQuestionResponse as jest.Mock).mock.calls[0][0];
    expect(initialArg.responseContent.votes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ optionId: 'a', votes: 2 }),
        expect.objectContaining({ optionId: 'b', votes: -1 }),
      ]),
    );

    // Check trimmed metadata passed into completion
    const completeArg = (actions.completeSurveyResponse as jest.Mock).mock.calls[0][0];
    expect(completeArg.metadata.eventSummary.totalEvents).toBeDefined();
    expect(completeArg.uuid).toBe('uuid-initial');
  });

  it('adds additional question response when surveyResponseId exists but not questionResponseId', async () => {
    const { actions, submission } = setupMocks();
    const dispatch = jest.fn((action) => action);
    const navigate = jest.fn();

    await submission.submitSurvey({
      optionList,
      remainingCredit: 5,
      totalCredits: 10,
      currCost: 5,
      state: baseState,
      questions,
      metadata,
      qsOptions: { responseStatus: { submitted: false, surveyResponseId: 'resp-123', uuid: 'uuid-123', questionResponseIds: {} } },
      dispatch: dispatch as any,
      navigate,
      id: 'survey-1',
      setIsSubmitting: jest.fn(),
      setError: jest.fn(),
    });

    expect(actions.submitAdditionalQuestionResponse).toHaveBeenCalled();
    expect(actions.completeSurveyResponse).toHaveBeenCalled();
  });

  it('updates existing question response when questionResponseId is present', async () => {
    const { actions, submission } = setupMocks();
    const dispatch = jest.fn((action) => action);
    const navigate = jest.fn();

    await submission.submitSurvey({
      optionList,
      remainingCredit: 5,
      totalCredits: 10,
      currCost: 5,
      state: baseState,
      questions,
      metadata,
      qsOptions: { responseStatus: { submitted: false, surveyResponseId: 'resp-123', uuid: 'uuid-123', questionResponseIds: { qv1: 'qr-1' } } },
      dispatch: dispatch as any,
      navigate,
      id: 'survey-1',
      setIsSubmitting: jest.fn(),
      setError: jest.fn(),
    });

    expect(actions.updateQuestionResponse).toHaveBeenCalled();
    expect(actions.completeSurveyResponse).toHaveBeenCalled();
  });
});
