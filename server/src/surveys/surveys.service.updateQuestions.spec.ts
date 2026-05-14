import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SurveysService } from './surveys.service';

describe('SurveysService.updateSurveyQuestionsById', () => {
  const userId = new Types.ObjectId();
  const surveyId = new Types.ObjectId();

  const buildService = (overrides?: {
    surveyModel?: any;
    coreService?: any;
    coreLogicService?: any;
  }) => {
    const surveyModel =
      overrides?.surveyModel ??
      ({
        findByIdAndUpdate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({}),
        }),
      } as any);

    const coreService =
      overrides?.coreService ??
      ({
        getUserById: jest.fn().mockResolvedValue({}),
        getQuestionsByManyIds: jest.fn().mockResolvedValue([]),
      } as any);

    const coreLogicService =
      overrides?.coreLogicService ??
      ({
        validateUserAccessBySurveyId: jest.fn().mockResolvedValue(true),
      } as any);

    const service = new SurveysService(
      surveyModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      coreService as any,
      coreLogicService as any,
    );

    return { service, surveyModel, coreService, coreLogicService };
  };

  it('throws when referenced question IDs do not resolve in the shared collection', async () => {
    const { service, surveyModel, coreService } = buildService({
      coreService: {
        getUserById: jest.fn().mockResolvedValue({}),
        getQuestionsByManyIds: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(
      service.updateSurveyQuestionsById(userId, surveyId, {
        questions: [new Types.ObjectId().toHexString()],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(coreService.getQuestionsByManyIds).toHaveBeenCalled();
    expect(surveyModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('updates when all question IDs resolve', async () => {
    const questionId = new Types.ObjectId();
    const updateResult = { _id: surveyId, questions: [questionId] };

    const surveyModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updateResult),
      }),
    };

    const coreService = {
      getUserById: jest.fn().mockResolvedValue({}),
      getQuestionsByManyIds: jest.fn().mockResolvedValue([
        { _id: questionId, type: 'text' },
      ]),
    };

    const coreLogicService = {
      validateUserAccessBySurveyId: jest.fn().mockResolvedValue(true),
    };

    const { service } = buildService({
      surveyModel,
      coreService,
      coreLogicService,
    });

    const result = await service.updateSurveyQuestionsById(userId, surveyId, {
      questions: [questionId.toHexString()],
    } as any);

    expect(result).toEqual(updateResult);
    expect(surveyModel.findByIdAndUpdate).toHaveBeenCalledWith(
      surveyId,
      { $set: { questions: [questionId] } },
      { new: true },
    );
  });

  it('supports $oid wrapper objects from raw JSON payloads', async () => {
    const questionId = new Types.ObjectId();
    const surveyModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: surveyId, questions: [questionId] }),
      }),
    };
    const coreService = {
      getUserById: jest.fn().mockResolvedValue({}),
      getQuestionsByManyIds: jest.fn().mockResolvedValue([
        { _id: questionId, type: 'text' },
      ]),
    };
    const coreLogicService = {
      validateUserAccessBySurveyId: jest.fn().mockResolvedValue(true),
    };

    const { service } = buildService({
      surveyModel,
      coreService,
      coreLogicService,
    });

    const result = await service.updateSurveyQuestionsById(userId, surveyId, {
      questions: [{ $oid: questionId.toHexString() }] as any,
    } as any);

    expect(result).toEqual({ _id: surveyId, questions: [questionId] });
    expect(surveyModel.findByIdAndUpdate).toHaveBeenCalledWith(
      surveyId,
      { $set: { questions: [questionId] } },
      { new: true },
    );
  });
});
