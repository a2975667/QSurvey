import { Model, Types } from 'mongoose';
import { UserResponseService } from '../user-response.service';

// A minimal QVPlus question: 2 options, 2 rounds, each round owning one followup.
// round-1 → fu-1 (choices c-1a, c-1b); round-2 → fu-2 (choices c-2a).
const QVPLUS_QUESTION = {
  type: 'qvplus',
  options: [
    { optionId: 'opt-1', optionName: 'A' },
    { optionId: 'opt-2', optionName: 'B' },
  ],
  setting: {
    rounds: [
      {
        roundId: 'round-1',
        followupQuestions: [
          { followupId: 'fu-1', choices: [{ choiceId: 'c-1a' }, { choiceId: 'c-1b' }] },
        ],
      },
      {
        roundId: 'round-2',
        followupQuestions: [
          { followupId: 'fu-2', choices: [{ choiceId: 'c-2a' }] },
        ],
      },
    ],
  },
};

const makeService = (question: any = QVPLUS_QUESTION) => {
  const surveyResponseModel = {
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  } as unknown as Model<any>;

  const questionResponseModel = {
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  } as unknown as Model<any>;

  const questionModel = {} as unknown as Model<any>;

  const coreService = {
    getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
    getQuestionById: jest.fn().mockResolvedValue(question),
  };

  const service = new UserResponseService(
    surveyResponseModel,
    questionResponseModel,
    questionModel,
    coreService as any,
    {} as any,
    {} as any,
  );

  // Silence validation/lookup internals so we exercise only the write-time filter.
  (service as any)._findSurveyResponseByID = jest
    .fn()
    .mockResolvedValue({ uKey: 'u', uuid: 'uuid' });
  (service as any)._validateSurveyAvaliable = jest.fn();
  (service as any)._validateSKeySetting = jest.fn();
  (service as any)._validateUKeyCorrect = jest.fn();
  (service as any)._validateUUIDCorrect = jest.fn();

  return { service, questionResponseModel, coreService };
};

const baseDto = () => ({
  uuid: 'uuid',
  sKey: '',
  uKey: 'u',
  surveyResponseId: new Types.ObjectId(),
  questionResponseId: new Types.ObjectId(),
  surveyId: new Types.ObjectId(),
  questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
});

const savedContent = (questionResponseModel: any) => {
  const call = (questionResponseModel.findByIdAndUpdate as jest.Mock).mock
    .calls[0];
  return call[1].responseContent;
};

describe('QVPlus followup filtering (write-time)', () => {
  it('keeps valid followups (incl. choiceId null) and drops foreign optionId/followupId/choiceId', async () => {
    const { service, questionResponseModel } = makeService();

    const dto: any = {
      ...baseDto(),
      responseContent: {
        votes: [{ optionId: 'opt-1', votes: 1 }],
        followupAnswers: [
          // valid: optionId/followupId/choiceId all belong to round-1
          { roundId: 'round-1', optionId: 'opt-1', followupId: 'fu-1', choiceId: 'c-1a' },
          // valid: choiceId null means "left unanswered"
          { roundId: 'round-1', optionId: 'opt-2', followupId: 'fu-1', choiceId: null },
          // dropped: optionId not on the question
          { roundId: 'round-1', optionId: 'opt-999', followupId: 'fu-1', choiceId: 'c-1a' },
          // dropped: fu-2 belongs to round-2, not round-1 (cross-level mismatch)
          { roundId: 'round-1', optionId: 'opt-1', followupId: 'fu-2', choiceId: 'c-2a' },
          // dropped: choiceId not offered by fu-1
          { roundId: 'round-1', optionId: 'opt-1', followupId: 'fu-1', choiceId: 'bad' },
        ],
      },
    };

    await service.updateQuestionResponse(dto);

    expect(savedContent(questionResponseModel).followupAnswers).toEqual([
      { roundId: 'round-1', optionId: 'opt-1', followupId: 'fu-1', choiceId: 'c-1a' },
      { roundId: 'round-1', optionId: 'opt-2', followupId: 'fu-1', choiceId: null },
    ]);
  });

  it('does not add a followupAnswers field to a plain QV response', async () => {
    const qvQuestion = { type: 'qv', options: [{ optionId: 'opt-1' }] };
    const { service, questionResponseModel } = makeService(qvQuestion);

    const dto: any = {
      ...baseDto(),
      responseContent: { votes: [{ optionId: 'opt-1', votes: 2 }] },
    };

    await service.updateQuestionResponse(dto);

    expect(savedContent(questionResponseModel).followupAnswers).toBeUndefined();
  });
});
