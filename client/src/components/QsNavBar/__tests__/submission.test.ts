import { submitQvQuestion } from '../submission';
import { recordQuestionResponseId } from '../../../features/unifiedResponsesSlice';
import { QvQuestionState, UnifiedResponsesState } from '../../../types/responseTypes';

jest.mock('../../../features/options/api/options.api', () => {
  const makeMockThunk = (typePrefix: string, buildPayload: (payload: any) => any = () => ({})) => {
    const fn: any = jest.fn((payload: any) => async () => ({
      type: `${typePrefix}/fulfilled`,
      payload: buildPayload(payload),
      meta: { arg: payload },
    }));
    fn.pending = { type: `${typePrefix}/pending`, match: () => false };
    fn.fulfilled = { type: `${typePrefix}/fulfilled`, match: () => true };
    fn.rejected = { type: `${typePrefix}/rejected`, match: () => false };
    return fn;
  };

  return {
    submitInitialQuestionResponse: makeMockThunk('options/submitInitialQuestionResponse', (payload) => ({
      surveyResponse: { _id: 'resp-1', uuid: 'uuid-1' },
      questionResponse: { _id: 'qr-1', questionId: payload.questionId },
    })),
    submitAdditionalQuestionResponse: makeMockThunk('options/submitAdditionalQuestionResponse', (payload) => ({
      questionResponse: { _id: 'qr-additional', questionId: payload.questionId },
    })),
    updateQuestionResponse: makeMockThunk('options/updateQuestionResponse', (payload) => ({
      questionResponse: { _id: payload.questionResponseId, questionId: payload.questionId },
    })),
    completeSurveyResponse: makeMockThunk('options/completeSurveyResponse'),
  };
});

const {
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
} = require('../../../features/options/api/options.api');

const createDispatch = () => jest.fn();

describe('submitQvQuestion', () => {
  const baseQvState: QvQuestionState = {
    type: 'qv',
    questionId: 'qv1',
    totalCredits: 10,
    bins: { hasUndecided: true, hasSkip: true, userDefined: [] },
    categoriesOrder: ['Undecided', 'Positive', 'Skip'],
    positionsByGroup: {
      Undecided: ['o1', 'o2'],
      Positive: [],
      Skip: [],
    },
    options: {
      o1: { optionId: 'o1', optionName: 'Alpha', group: 'Undecided', groupPosition: 0, globalPosition: 0, votes: 3 },
      o2: { optionId: 'o2', optionName: 'Beta', group: 'Undecided', groupPosition: 1, globalPosition: 1, votes: 0 },
    },
    history: { revision: 0 },
  };

  const unifiedInitial: UnifiedResponsesState = {
    status: 'in_progress',
    error: undefined,
    surveyId: 'survey-1',
    surveyResponseId: undefined,
    uuid: undefined,
    questionResponseIds: {},
    byQuestionId: { qv1: baseQvState },
    qvNavigator: { order: ['qv1'], activeQuestionId: 'qv1', completed: {} },
    submitQueue: [],
  };

  const metadata = { surveyId: 'survey-1', sKey: undefined, uKey: undefined };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new survey response when none exists', async () => {
    const dispatch = createDispatch();
    dispatch.mockResolvedValueOnce({
      type: 'options/submitInitialQuestionResponse/fulfilled',
      payload: {
        surveyResponse: { _id: 'resp-1', uuid: 'uuid-1' },
        questionResponse: { _id: 'qr-1', questionId: 'qv1' },
      },
    });

    await submitQvQuestion({
      dispatch: dispatch as any,
      questionId: 'qv1',
      qvState: baseQvState,
      unifiedState: unifiedInitial,
      metadata,
    });

    expect(submitInitialQuestionResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        surveyId: 'survey-1',
        questionId: 'qv1',
        IsNewSurveyResponse: true,
        navigator: { order: ['qv1'], activeQuestionId: 'qv1' },
      }),
    );

    const callArg = submitInitialQuestionResponse.mock.calls[0][0];
    expect(callArg.responseContent.group).toEqual({ o1: 'Undecided', o2: 'Undecided' });
    expect(callArg.responseContent.position).toEqual({ o1: 0, o2: 1 });
    expect(callArg.responseContent.bins).toEqual({
      hasUndecided: true,
      hasSkip: true,
      userDefined: [],
    });
    expect(callArg.responseContent.categoriesOrder).toEqual(['Undecided', 'Positive', 'Skip']);

    expect(dispatch).toHaveBeenCalledWith(
      recordQuestionResponseId({
        questionId: 'qv1',
        questionResponseId: 'qr-1',
        surveyResponseId: 'resp-1',
      }),
    );
  });

  it('adds additional question response when survey response exists', async () => {
    const dispatch = createDispatch();
    dispatch.mockResolvedValueOnce({
      type: 'options/submitAdditionalQuestionResponse/fulfilled',
      payload: { questionResponse: { _id: 'qr-additional', questionId: 'qv1' } },
    });

    await submitQvQuestion({
      dispatch: dispatch as any,
      questionId: 'qv1',
      qvState: baseQvState,
      unifiedState: {
        ...unifiedInitial,
        surveyResponseId: 'resp-1',
        uuid: 'uuid-1',
      },
      metadata,
    });

    expect(submitAdditionalQuestionResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        surveyResponseId: 'resp-1',
        uuid: 'uuid-1',
        navigator: { order: ['qv1'], activeQuestionId: 'qv1' },
      }),
    );

    expect(dispatch).toHaveBeenCalledWith(
      recordQuestionResponseId({
        questionId: 'qv1',
        questionResponseId: 'qr-additional',
        surveyResponseId: 'resp-1',
      }),
    );
  });

  it('updates existing question response when ids are present', async () => {
    const dispatch = createDispatch();
    dispatch.mockResolvedValueOnce({
      type: 'options/updateQuestionResponse/fulfilled',
      payload: { questionResponse: { _id: 'qr-123', questionId: 'qv1' } },
    });

    await submitQvQuestion({
      dispatch: dispatch as any,
      questionId: 'qv1',
      qvState: baseQvState,
      unifiedState: {
        ...unifiedInitial,
        surveyResponseId: 'resp-1',
        uuid: 'uuid-1',
        questionResponseIds: { qv1: 'qr-123' },
      },
      metadata,
    });

    expect(updateQuestionResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        questionResponseId: 'qr-123',
        surveyResponseId: 'resp-1',
        uuid: 'uuid-1',
        navigator: { order: ['qv1'], activeQuestionId: 'qv1' },
      }),
    );
  });
});
