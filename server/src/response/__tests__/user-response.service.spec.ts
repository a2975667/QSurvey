jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: {
    createForClass: jest.fn().mockReturnValue({
      index: jest.fn(),
    }),
  },
}));

jest.mock('mongoose', () => ({
  Schema: class {},
  SchemaFactory: { createForClass: jest.fn() },
  model: jest.fn(),
  connection: { on: jest.fn() },
  Types: { ObjectId: jest.fn() },
}));

import { Model, Types } from 'mongoose';
import { UserResponseService } from '../user-response.service';

const createService = () => {
  const surveyResponseModel = {
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  } as unknown as Model<any>;

  const questionResponseModel = {} as unknown as Model<any>;
  const questionModel = {} as unknown as Model<any>;
  const coreService: any = {
    getQuestionById: jest.fn().mockResolvedValue({ type: 'qv' }),
  };
  const coreLogicService: any = {};
  const surveysService: any = {};

  const service = new UserResponseService(
    surveyResponseModel,
    questionResponseModel,
    questionModel,
    coreService,
    coreLogicService,
    surveysService,
  );

  return { service, surveyResponseModel };
};

const firstQuestionId = '000000000000000000000001';
const secondQuestionId = '000000000000000000000002';
const disabledQuestionId = '000000000000000000000003';
const unansweredQuestionId = '000000000000000000000004';

const createAggregatesService = () => {
  const surveyResponseModel = {
    distinct: jest.fn().mockReturnValue({
      collation: () => ({ exec: jest.fn().mockResolvedValue([]) }),
    }),
  } as unknown as Model<any>;
  const questionResponseModel = {} as unknown as Model<any>;
  const questionModel = {} as unknown as Model<any>;
  const coreService: any = {
    getSurveyResponseByUUID: jest.fn(),
    getSurveyById: jest.fn(),
    getQuestionById: jest.fn().mockResolvedValue({ type: 'qv' }),
    getQuestionResponsesByManyIds: jest.fn().mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: firstQuestionId,
        createdTime: new Date('2025-01-01T00:00:00Z'),
        responseContent: { votes: [] },
      },
    ]),
    getQuestionsByManyIds: jest.fn().mockResolvedValue([
      {
        _id: firstQuestionId,
        question: 'Question 1',
        type: 'qv',
        respondentResultsEnabled: true,
      },
    ]),
  };
  const coreLogicService: any = {
    validateSurveySKey: jest.fn(),
    validateSurveyResponseUKey: jest.fn(),
  };
  const surveysService: any = {
    getSurveyResults: jest.fn(),
  };

  const service = new UserResponseService(
    surveyResponseModel,
    questionResponseModel,
    questionModel,
    coreService,
    coreLogicService,
    surveysService,
  );

  return { service, coreService, coreLogicService, surveysService };
};

describe('UserResponseService helpers', () => {
  it('normalises QV response content with placement metadata', () => {
    const { service } = createService();
    const rawContent = {
      totalCredits: 20,
      votes: [
        {
          optionId: 'a',
          optionName: 'Alpha',
          votes: 3,
          group: 'Positive',
          groupPosition: 0,
        },
        {
          optionId: 'b',
          optionName: 'Beta',
          votes: -1,
          group: 'Negative',
          groupPosition: 0,
        },
      ],
      group: { a: 'Positive', b: 'Negative', invalid: '' },
      position: { a: 1, b: 2, invalid: 'n/a' },
      bins: {
        hasUndecided: true,
        hasSkip: false,
        userDefined: ['Positive', 'Negative', 'Positive'],
      },
      categoriesOrder: ['Undecided', 'Positive', 'Negative', '', 'Positive'],
      navigator: {
        order: ['qv1', 'qv2', 'qv1'],
        activeQuestionId: 'qv2',
        completed: ['qv1', ''],
      },
    };

    const normalized = (service as any)._normalizeResponseContent(rawContent);

    expect(normalized).toMatchObject({
      totalCredits: 20,
      group: { a: 'Positive', b: 'Negative' },
      position: { a: 1, b: 2 },
      bins: {
        hasUndecided: true,
        hasSkip: false,
        userDefined: ['Positive', 'Negative'],
      },
      categoriesOrder: ['Undecided', 'Positive', 'Negative'],
      navigator: {
        order: ['qv1', 'qv2'],
        activeQuestionId: 'qv2',
        completed: ['qv1'],
      },
    });
    expect(Array.isArray(normalized.votes)).toBe(true);
    expect(normalized.votes).toHaveLength(2);
  });

  it('projects QVPlus rounds to {roundId, voteSnapshot} and drops unknown keys', () => {
    const { service } = createService();
    const rawContent = {
      votes: [{ optionId: 'a', optionName: 'Alpha', votes: 1 }],
      rounds: [
        {
          roundId: 'round-1',
          voteSnapshot: { totalVotes: 10 },
          // The fields below are not part of the round contract and must not
          // survive normalization.
          hugePayload: 'x'.repeat(100),
          isAdmin: true,
          secretField: { nested: [1, 2, 3] },
        },
        // Dropped entirely: no usable roundId.
        { roundId: '', voteSnapshot: {} },
        { notARound: true },
      ],
    };

    const normalized = (service as any)._normalizeResponseContent(rawContent);

    expect(normalized.rounds).toEqual([
      { roundId: 'round-1', voteSnapshot: { totalVotes: 10 } },
    ]);
    // Unknown keys are gone, not merely ignored downstream.
    expect(normalized.rounds[0]).not.toHaveProperty('hugePayload');
    expect(normalized.rounds[0]).not.toHaveProperty('isAdmin');
    expect(normalized.rounds[0]).not.toHaveProperty('secretField');
  });

  it('sets voteSnapshot to undefined when it is missing or not an object', () => {
    const { service } = createService();
    const rawContent = {
      votes: [{ optionId: 'a', optionName: 'Alpha', votes: 1 }],
      rounds: [
        { roundId: 'r1' },
        { roundId: 'r2', voteSnapshot: 'not-an-object' },
      ],
    };

    const normalized = (service as any)._normalizeResponseContent(rawContent);

    expect(normalized.rounds).toEqual([
      { roundId: 'r1', voteSnapshot: undefined },
      { roundId: 'r2', voteSnapshot: undefined },
    ]);
  });

});

describe('UserResponseService completed aggregates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Types.ObjectId as unknown as jest.Mock).mockImplementation((value) => ({
      toString: () => value,
    }));
    (Types.ObjectId as any).isValid = jest.fn().mockReturnValue(true);
  });

  const completedSurveyResponse = {
    _id: 'survey-response-1',
    uuid: 'uuid-1',
    status: 'Complete',
    surveyId: 'survey-1',
    uKey: 'respondent-key',
    sKey: 'survey-key',
    questionResponses: ['question-response-1'],
    endTime: new Date('2025-01-01T00:00:00Z'),
  };

  it('omits asOf when requesting live aggregates', async () => {
    const { service, coreService, surveysService } = createAggregatesService();

    coreService.getSurveyResponseByUUID.mockResolvedValue({
      uuid: 'uuid-1',
      status: 'Complete',
      surveyId: 'survey-1',
      sKey: 'survey-key',
      questionResponses: ['question-response-1'],
      endTime: new Date('2025-01-01T00:00:00Z'),
    });
    coreService.getSurveyById.mockResolvedValue({
      settings: { hasUKey: false },
      questions: [firstQuestionId],
    });
    surveysService.getSurveyResults.mockResolvedValue({
      meta: {},
      raw: [],
    });

    await service.getCompletedSurveyAggregates({
      uuid: 'uuid-1',
      surveyId: 'survey-1',
      questionId: firstQuestionId,
      limit: 50,
      cursor: undefined,
      sKey: undefined,
      uKey: undefined,
    } as any);

    expect(surveysService.getSurveyResults).toHaveBeenCalledWith(
      '000000000000000000000000',
      expect.any(Array),
      'survey-1',
      expect.objectContaining({
        questionId: firstQuestionId,
        status: 'Complete',
      }),
      { sKey: 'survey-key' },
    );

    const [, , , query] = surveysService.getSurveyResults.mock.calls[0];
    expect(query.asOf).toBeUndefined();
  });

  it('returns 403 for completed snapshot when survey participant results are disabled', async () => {
    const { service, coreService, coreLogicService } =
      createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasSKey: true,
        hasUKey: true,
        respondentsCanViewResults: false,
      },
    });

    await expect(
      service.getCompletedSurveyResponseSnapshot({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this survey [URS0561]',
      status: 403,
    });

    expect(coreLogicService.validateSurveySKey).not.toHaveBeenCalled();
    expect(coreLogicService.validateSurveyResponseUKey).not.toHaveBeenCalled();
    expect(coreService.getQuestionResponsesByManyIds).not.toHaveBeenCalled();
  });

  it('returns 403 for completed aggregates when survey participant results are disabled', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: false,
      },
      questions: [firstQuestionId],
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: firstQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this survey [URS0561]',
      status: 403,
    });

    expect(coreService.getQuestionById).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('keeps completed snapshot available when survey results are enabled', async () => {
    const { service, coreService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: true,
      },
      questions: [firstQuestionId],
    });
    coreService.getQuestionResponsesByManyIds.mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: firstQuestionId,
        createdTime: new Date('2025-01-01T00:00:00Z'),
        responseContent: { votes: [] },
      },
    ]);

    const result = await service.getCompletedSurveyResponseSnapshot({
      uuid: 'uuid-1',
      surveyId: 'survey-1',
    } as any);

    expect(result.questionResponses).toHaveLength(1);
    expect(coreService.getQuestionById).not.toHaveBeenCalled();
  });

  it('preserves snapshot-specific error code when uuid is incomplete', async () => {
    const { service, coreService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue({
      ...completedSurveyResponse,
      status: 'Incomplete',
    });

    await expect(
      service.getCompletedSurveyResponseSnapshot({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
      } as any),
    ).rejects.toMatchObject({
      message: 'Survey response is not marked complete yet [URS0505]',
      status: 400,
    });
  });

  it('returns 403 for participant aggregates when question results are disabled', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: true,
      },
      questions: [firstQuestionId],
    });
    coreService.getQuestionById.mockResolvedValue({
      _id: firstQuestionId,
      type: 'qv',
      respondentResultsEnabled: false,
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: firstQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question [URS0562]',
      status: 403,
    });

    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('returns 403 with the question participant-results code when the question is not in the survey', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: true,
      },
      questions: ['other-question'],
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: firstQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question [URS0562]',
      status: 403,
    });

    expect(coreService.getQuestionById).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('returns 400 for participant aggregates when questionId is malformed', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    (Types.ObjectId as any).isValid = jest
      .fn()
      .mockImplementation((value) => value !== 'not-an-object-id');
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: true,
      },
      questions: [firstQuestionId],
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: 'not-an-object-id',
      } as any),
    ).rejects.toMatchObject({
      message: 'questionId is invalid [URS0560]',
      status: 400,
    });

    expect(coreService.getQuestionById).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('returns 403 for participant aggregates when question type is unsupported', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: true,
      },
      questions: [{ _id: firstQuestionId }],
    });
    coreService.getQuestionById.mockResolvedValue({
      _id: firstQuestionId,
      type: 'text_block',
      respondentResultsEnabled: true,
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: firstQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question [URS0562]',
      status: 403,
    });

    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('uses stored participant keys for aggregate scope when visibility fields are missing', async () => {
    const { service, coreService, coreLogicService, surveysService } =
      createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasSKey: true,
        hasUKey: true,
      },
      questions: [firstQuestionId],
    });
    coreService.getQuestionById.mockResolvedValue({
      _id: firstQuestionId,
      type: 'qv',
    });
    surveysService.getSurveyResults.mockResolvedValue({
      meta: { questionId: firstQuestionId },
      raw: [],
    });

    await service.getCompletedSurveyAggregates({
      uuid: 'uuid-1',
      surveyId: 'survey-1',
      questionId: firstQuestionId,
    } as any);

    expect(coreLogicService.validateSurveySKey).not.toHaveBeenCalled();
    expect(coreLogicService.validateSurveyResponseUKey).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).toHaveBeenCalledWith(
      '000000000000000000000000',
      expect.any(Array),
      'survey-1',
      expect.objectContaining({
        questionId: firstQuestionId,
        status: 'Complete',
      }),
      { sKey: 'survey-key' },
    );
  });

  it('returns 400 for participant aggregates when uuid is incomplete', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue({
      ...completedSurveyResponse,
      status: 'Incomplete',
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: firstQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Survey response is not marked complete yet [URS0551]',
      status: 400,
    });

    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('rejects participant aggregates for questions not answered by the uuid', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        hasUKey: false,
        respondentsCanViewResults: true,
      },
      questions: [firstQuestionId, secondQuestionId],
    });
    coreService.getQuestionResponsesByManyIds.mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: firstQuestionId,
      },
    ]);

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: secondQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question [URS0562]',
      status: 403,
    });

    expect(coreService.getQuestionById).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('treats missing question response ids as no answered questions', async () => {
    const { service, coreService, surveysService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue({
      ...completedSurveyResponse,
      questionResponses: undefined,
    });
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        respondentsCanViewResults: true,
      },
      questions: [firstQuestionId],
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: firstQuestionId,
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question [URS0562]',
      status: 403,
    });

    expect(coreService.getQuestionResponsesByManyIds).not.toHaveBeenCalled();
    expect(coreService.getQuestionById).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).not.toHaveBeenCalled();
  });

  it('returns only answered enabled supported questions for completed-results dropdown', async () => {
    const { service, coreService } = createAggregatesService();
    coreService.getSurveyResponseByUUID.mockResolvedValue(
      completedSurveyResponse,
    );
    coreService.getSurveyById.mockResolvedValue({
      settings: {
        respondentsCanViewResults: true,
      },
      questions: [disabledQuestionId, firstQuestionId, unansweredQuestionId],
    });
    coreService.getQuestionResponsesByManyIds.mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: firstQuestionId,
      },
      {
        _id: 'question-response-2',
        questionId: disabledQuestionId,
      },
    ]);
    coreService.getQuestionsByManyIds.mockResolvedValue([
      {
        _id: disabledQuestionId,
        question: 'Disabled',
        type: 'qv',
        respondentResultsEnabled: false,
      },
      {
        _id: firstQuestionId,
        question: 'Visible',
        type: 'selection',
        respondentResultsEnabled: true,
        options: [{ optionId: 'a', optionName: 'A', internalFlag: true }],
        setting: {
          totalCredits: 20,
          hidden: true,
          labelOverrides: {
            votePositive: 'supports',
            binLabels: { Positive: 'Support' },
          },
        },
        adminOnly: 'secret',
      },
      {
        _id: unansweredQuestionId,
        question: 'Unanswered',
        type: 'qv',
        respondentResultsEnabled: true,
      },
    ]);

    const result = await service.getCompletedSurveyResultsQuestions({
      uuid: 'uuid-1',
      surveyId: 'survey-1',
    } as any);

    expect(result.questions).toEqual([
      {
        questionId: firstQuestionId,
        label: 'Visible',
        type: 'selection',
        position: 1,
        options: [{ optionId: 'a', optionName: 'A' }],
        setting: {
          labelOverrides: {
            votePositive: 'supports',
            binLabels: { Positive: 'Support' },
          },
        },
        totalCredits: 20,
      },
    ]);
  });
});
