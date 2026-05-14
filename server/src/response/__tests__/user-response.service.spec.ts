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
import { DuplicateSubmissionError } from '../errors';

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

const createDuplicateGuardService = () => {
  const surveyResponseModel: any = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };

  const questionResponseModel: any = jest.fn();
  questionResponseModel.findOne = jest.fn();
  questionResponseModel.findByIdAndUpdate = jest.fn();

  const questionModel: any = {};
  const coreService: any = {
    getSurveyById: jest.fn(),
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

  return {
    service,
    surveyResponseModel,
    questionResponseModel,
    coreService,
  };
};

const createAggregatesService = () => {
  const surveyResponseModel = {} as unknown as Model<any>;
  const questionResponseModel = {} as unknown as Model<any>;
  const questionModel = {} as unknown as Model<any>;
  const coreService: any = {
    getSurveyResponseByUUID: jest.fn(),
    getSurveyById: jest.fn(),
    getQuestionById: jest.fn().mockResolvedValue({ type: 'qv' }),
    getQuestionResponsesByManyIds: jest.fn().mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: 'question-1',
        createdTime: new Date('2025-01-01T00:00:00Z'),
        responseContent: { votes: [] },
      },
    ]),
    getQuestionsByManyIds: jest.fn().mockResolvedValue([
      {
        _id: 'question-1',
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

  it('pushes question response and sets navigator snapshot when provided', async () => {
    const { service, surveyResponseModel } = createService();
    const execMock = jest.fn().mockResolvedValue(null);
    (surveyResponseModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
      exec: execMock,
    });

    const navigatorSnapshot = {
      order: ['qv1'],
      activeQuestionId: 'qv1',
      completed: ['qv1'],
    };

    await (service as any)._pushQuestionResponseIntoSurveyResponse(
      'qr-id',
      'sr-id',
      navigatorSnapshot,
    );

    expect(surveyResponseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'sr-id',
      expect.objectContaining({
        $push: { questionResponses: 'qr-id' },
        $set: expect.objectContaining({
          qvNavigator: navigatorSnapshot,
          lastUpdate: expect.any(String),
        }),
      }),
      { returnOriginal: false },
    );
    expect(execMock).toHaveBeenCalled();
  });
});

describe('UserResponseService duplicate guards', () => {
  it('reuses existing question responses without creating duplicates', async () => {
    const { service, surveyResponseModel, questionResponseModel, coreService } =
      createDuplicateGuardService();

    const surveyId = 'survey-1';
    const surveyResponseId = 'sr-1';
    const questionId = 'question-1';

    const surveyMetadata = {
      settings: {
        isAvailable: true,
        hasSKey: false,
        hasUKey: false,
      },
    };

    const surveyResponseDoc = {
      _id: surveyResponseId,
      uuid: 'uuid-1',
      uKey: undefined,
      questionResponses: ['qr-1'],
    };

    coreService.getSurveyById.mockResolvedValue(surveyMetadata);
    const findByIdExec = jest.fn().mockResolvedValue(surveyResponseDoc);
    surveyResponseModel.findById.mockReturnValue({ exec: findByIdExec });
    surveyResponseModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(surveyResponseDoc),
    });

    const existingQuestionResponse = {
      _id: 'qr-1',
      responseContent: { votes: [{ optionId: 'opt-1', votes: 1 }] },
    };
    const updatedQuestionResponse = {
      _id: 'qr-1',
      responseContent: { votes: [] },
    };

    questionResponseModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingQuestionResponse),
    });
    const updateExec = jest.fn().mockResolvedValue(updatedQuestionResponse);
    questionResponseModel.findByIdAndUpdate.mockReturnValue({
      exec: updateExec,
    });

    const touchedSurveyResponse = {
      _id: surveyResponseId,
      questionResponses: ['qr-1'],
      qvNavigator: { order: ['qv2'] },
    };

    const touchExec = jest.fn().mockResolvedValue(touchedSurveyResponse);
    surveyResponseModel.findByIdAndUpdate.mockReturnValue({ exec: touchExec });

    const dto: any = {
      uuid: 'uuid-1',
      surveyResponseId,
      surveyId,
      questionId,
      responseContent: { votes: [] },
      sKey: undefined,
      uKey: undefined,
      navigator: { order: ['qv2', 'qv2'] },
    };

    const result = await service.CreateQuestionAndUpdateSurveyResponse(dto);

    expect(questionResponseModel).not.toHaveBeenCalled();
    expect(questionResponseModel.findOne).toHaveBeenCalledWith({
      surveyResponseId: surveyResponseDoc._id,
      questionId: dto.questionId,
    });
    expect(questionResponseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      existingQuestionResponse._id,
      { responseContent: { votes: [] } },
      { returnOriginal: false },
    );

    expect(surveyResponseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      dto.surveyResponseId,
      expect.objectContaining({
        $set: expect.objectContaining({
          lastUpdate: expect.any(String),
          qvNavigator: { order: ['qv2'] },
        }),
      }),
      { returnOriginal: false },
    );
    const surveyUpdate = surveyResponseModel.findByIdAndUpdate.mock.calls[0][1];
    expect(surveyUpdate.$push).toBeUndefined();
    expect(touchExec).toHaveBeenCalled();
    expect(result).toEqual({
      surveyResponse: touchedSurveyResponse,
      questionResponse: updatedQuestionResponse,
    });
  });

  it('throws DuplicateSubmissionError when completing a survey twice', async () => {
    const { service, surveyResponseModel, questionResponseModel, coreService } =
      createDuplicateGuardService();

    const surveyMetadata = {
      settings: {
        isAvailable: true,
        hasSKey: false,
        hasUKey: false,
      },
    };

    const completedSurveyResponse = {
      _id: 'sr-1',
      uuid: 'uuid-1',
      uKey: undefined,
      status: 'Complete',
      questionResponses: ['qr-1'],
    };

    coreService.getSurveyById.mockResolvedValue(surveyMetadata);
    surveyResponseModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(completedSurveyResponse),
    });

    const dto: any = {
      uuid: 'uuid-1',
      surveyResponseId: 'sr-1',
      surveyId: 'survey-1',
      sKey: undefined,
      uKey: undefined,
    };

    await expect(
      service.markSurveyResponseAsCompleted(dto),
    ).rejects.toBeInstanceOf(DuplicateSubmissionError);

    expect(surveyResponseModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(questionResponseModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('UserResponseService text block skips', () => {
  it('skips text block responses for initial create calls', async () => {
    const savedSurveyResponse = { _id: 'sr-1', uuid: 'uuid-1' };
    const saveMock = jest.fn().mockResolvedValue(savedSurveyResponse);
    const surveyResponseModel = jest.fn().mockImplementation(() => ({
      save: saveMock,
    })) as unknown as Model<any>;
    const questionResponseModel = jest.fn() as unknown as Model<any>;
    const questionModel = {} as unknown as Model<any>;
    const coreService: any = {
      getSurveyById: jest.fn().mockResolvedValue({
        settings: {
          isAvailable: true,
          hasSKey: false,
          hasUKey: false,
        },
      }),
      getQuestionById: jest.fn().mockResolvedValue({ type: 'text_block' }),
    };

    const service = new UserResponseService(
      surveyResponseModel,
      questionResponseModel,
      questionModel,
      coreService,
      {} as any,
      {} as any,
    );

    const result = await service.createSurveyAndQuestionResponse({
      surveyId: 'survey-1',
      questionId: 'text-block-1',
      responseContent: {},
    } as any);

    expect(questionResponseModel).not.toHaveBeenCalled();
    expect(result.questionResponse).toBeNull();
    expect(result.surveyResponse).toBe(savedSurveyResponse);
    expect(surveyResponseModel).toHaveBeenCalledWith(
      expect.objectContaining({ questionResponses: [] }),
    );
  });

  it('skips text block responses for additional create calls', async () => {
    const surveyResponseDoc = {
      _id: 'sr-1',
      uuid: 'uuid-1',
      uKey: undefined,
    };
    const findOneExec = jest.fn().mockResolvedValue(surveyResponseDoc);
    const surveyResponseModel = {
      findOne: jest.fn().mockReturnValue({ exec: findOneExec }),
    } as unknown as Model<any>;
    const questionResponseModel = jest.fn() as unknown as Model<any>;
    const questionModel = {} as unknown as Model<any>;
    const coreService: any = {
      getSurveyById: jest.fn().mockResolvedValue({
        settings: {
          isAvailable: true,
          hasSKey: false,
          hasUKey: false,
        },
      }),
      getQuestionById: jest.fn().mockResolvedValue({ type: 'text_block' }),
    };

    const service = new UserResponseService(
      surveyResponseModel,
      questionResponseModel,
      questionModel,
      coreService,
      {} as any,
      {} as any,
    );

    const result = await service.CreateQuestionAndUpdateSurveyResponse({
      uuid: 'uuid-1',
      surveyResponseId: 'sr-1',
      surveyId: 'survey-1',
      questionId: 'text-block-1',
      responseContent: {},
    } as any);

    expect(questionResponseModel).not.toHaveBeenCalled();
    expect(result.questionResponse).toBeNull();
    expect(result.surveyResponse).toBe(surveyResponseDoc);
  });

  it('skips text block updates for updateQuestionResponse calls', async () => {
    const surveyResponseDoc = {
      _id: 'sr-1',
      uuid: 'uuid-1',
      uKey: undefined,
    };
    const findByIdExec = jest.fn().mockResolvedValue(surveyResponseDoc);
    const surveyResponseModel = {
      findById: jest.fn().mockReturnValue({ exec: findByIdExec }),
    } as unknown as Model<any>;
    const questionResponseModel = {
      findByIdAndUpdate: jest.fn(),
    } as unknown as Model<any>;
    const questionModel = {} as unknown as Model<any>;
    const coreService: any = {
      getSurveyById: jest.fn().mockResolvedValue({
        settings: {
          isAvailable: true,
          hasSKey: false,
          hasUKey: false,
        },
      }),
      getQuestionById: jest.fn().mockResolvedValue({ type: 'text_block' }),
    };

    const service = new UserResponseService(
      surveyResponseModel,
      questionResponseModel,
      questionModel,
      coreService,
      {} as any,
      {} as any,
    );

    const result = await service.updateQuestionResponse({
      uuid: 'uuid-1',
      surveyResponseId: 'sr-1',
      questionResponseId: 'qr-1',
      surveyId: 'survey-1',
      questionId: 'text-block-1',
      responseContent: {},
    } as any);

    expect(result).toBeNull();
    expect(questionResponseModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('skips text block responses for batch submissions', async () => {
    const surveyResponseDoc = {
      _id: 'sr-1',
      surveyId: 'survey-1',
      questionResponses: [],
      toObject: () => ({
        _id: 'sr-1',
        surveyId: 'survey-1',
        questionResponses: [],
      }),
    };
    const saveMock = jest.fn().mockResolvedValue(surveyResponseDoc);
    const surveyResponseModel = jest.fn().mockImplementation(() => ({
      save: saveMock,
    })) as any;
    surveyResponseModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const questionResponseModel = jest.fn() as unknown as Model<any>;
    const questionModel = {} as unknown as Model<any>;
    const coreService: any = {
      getSurveyById: jest.fn().mockResolvedValue({
        settings: {
          isAvailable: true,
          hasSKey: false,
          hasUKey: false,
        },
      }),
      getQuestionsByManyIds: jest
        .fn()
        .mockResolvedValue([{ _id: 'text-block-1', type: 'text_block' }]),
    };

    const service = new UserResponseService(
      surveyResponseModel,
      questionResponseModel,
      questionModel,
      coreService,
      {} as any,
      {} as any,
    );

    const result = await service.createBatchSurveyResponses({
      surveyId: 'survey-1',
      responses: [{ questionId: 'text-block-1', responseContent: {} }],
    } as any);

    expect(questionResponseModel).not.toHaveBeenCalled();
    expect(result.questionResponses).toEqual([]);
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
      questions: ['question-1'],
    });
    surveysService.getSurveyResults.mockResolvedValue({
      meta: {},
      raw: [],
    });

    await service.getCompletedSurveyAggregates({
      uuid: 'uuid-1',
      surveyId: 'survey-1',
      questionId: 'question-1',
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
        questionId: 'question-1',
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
      questions: ['question-1'],
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: 'question-1',
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
      questions: ['question-1'],
    });
    coreService.getQuestionResponsesByManyIds.mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: 'question-1',
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
      questions: ['question-1'],
    });
    coreService.getQuestionById.mockResolvedValue({
      _id: 'question-1',
      type: 'qv',
      respondentResultsEnabled: false,
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: 'question-1',
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question type or setting [URS0564]',
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
        questionId: 'question-1',
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
      questions: ['question-1'],
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
      questions: [{ _id: 'question-1' }],
    });
    coreService.getQuestionById.mockResolvedValue({
      _id: 'question-1',
      type: 'text_block',
      respondentResultsEnabled: true,
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: 'question-1',
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant results are not enabled for this question type or setting [URS0564]',
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
      questions: ['question-1'],
    });
    coreService.getQuestionById.mockResolvedValue({
      _id: 'question-1',
      type: 'qv',
    });
    surveysService.getSurveyResults.mockResolvedValue({
      meta: { questionId: 'question-1' },
      raw: [],
    });

    await service.getCompletedSurveyAggregates({
      uuid: 'uuid-1',
      surveyId: 'survey-1',
      questionId: 'question-1',
    } as any);

    expect(coreLogicService.validateSurveySKey).not.toHaveBeenCalled();
    expect(coreLogicService.validateSurveyResponseUKey).not.toHaveBeenCalled();
    expect(surveysService.getSurveyResults).toHaveBeenCalledWith(
      '000000000000000000000000',
      expect.any(Array),
      'survey-1',
      expect.objectContaining({
        questionId: 'question-1',
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
        questionId: 'question-1',
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
      questions: ['question-1', 'question-2'],
    });
    coreService.getQuestionResponsesByManyIds.mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: 'question-1',
      },
    ]);

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: 'question-2',
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant can only view results for questions they answered [URS0563]',
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
      questions: ['question-1'],
    });

    await expect(
      service.getCompletedSurveyAggregates({
        uuid: 'uuid-1',
        surveyId: 'survey-1',
        questionId: 'question-1',
      } as any),
    ).rejects.toMatchObject({
      message: 'Participant can only view results for questions they answered [URS0563]',
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
      questions: ['question-disabled', 'question-1', 'question-unanswered'],
    });
    coreService.getQuestionResponsesByManyIds.mockResolvedValue([
      {
        _id: 'question-response-1',
        questionId: 'question-1',
      },
      {
        _id: 'question-response-2',
        questionId: 'question-disabled',
      },
    ]);
    coreService.getQuestionsByManyIds.mockResolvedValue([
      {
        _id: 'question-disabled',
        question: 'Disabled',
        type: 'qv',
        respondentResultsEnabled: false,
      },
      {
        _id: 'question-1',
        question: 'Visible',
        type: 'selection',
        respondentResultsEnabled: true,
        options: [{ optionId: 'a', optionName: 'A', internalFlag: true }],
        setting: { totalCredits: 20, hidden: true },
        adminOnly: 'secret',
      },
      {
        _id: 'question-unanswered',
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
        questionId: 'question-1',
        label: 'Visible',
        type: 'selection',
        position: 1,
        options: [{ optionId: 'a', optionName: 'A' }],
        totalCredits: 20,
      },
    ]);
  });
});
