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

import { Model } from 'mongoose';
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
  const coreService: any = {};
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

describe('UserResponseService helpers', () => {
  it('normalises QV response content with placement metadata', () => {
    const { service } = createService();
    const rawContent = {
      totalCredits: 20,
      votes: [
        { optionId: 'a', optionName: 'Alpha', votes: 3, group: 'Positive', groupPosition: 0 },
        { optionId: 'b', optionName: 'Beta', votes: -1, group: 'Negative', groupPosition: 0 },
      ],
      group: { a: 'Positive', b: 'Negative', invalid: '' },
      position: { a: 1, b: 2, invalid: 'n/a' },
      bins: { hasUndecided: true, hasSkip: false, userDefined: ['Positive', 'Negative', 'Positive'] },
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
      bins: { hasUndecided: true, hasSkip: false, userDefined: ['Positive', 'Negative'] },
      categoriesOrder: ['Undecided', 'Positive', 'Negative'],
      navigator: { order: ['qv1', 'qv2'], activeQuestionId: 'qv2', completed: ['qv1'] },
    });
    expect(Array.isArray(normalized.votes)).toBe(true);
    expect(normalized.votes).toHaveLength(2);
  });

  it('pushes question response and sets navigator snapshot when provided', async () => {
    const { service, surveyResponseModel } = createService();
    const execMock = jest.fn().mockResolvedValue(null);
    (surveyResponseModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: execMock });

    const navigatorSnapshot = { order: ['qv1'], activeQuestionId: 'qv1', completed: ['qv1'] };

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
    const {
      service,
      surveyResponseModel,
      questionResponseModel,
      coreService,
    } = createDuplicateGuardService();

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
    questionResponseModel.findByIdAndUpdate.mockReturnValue({ exec: updateExec });

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
    const {
      service,
      surveyResponseModel,
      questionResponseModel,
      coreService,
    } = createDuplicateGuardService();

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

    await expect(service.markSurveyResponseAsCompleted(dto)).rejects.toBeInstanceOf(
      DuplicateSubmissionError,
    );

    expect(surveyResponseModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(questionResponseModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
