import { Model, Types } from 'mongoose';
import { UserResponseService } from '../user-response.service';

const makeService = (
  overrides: Partial<{
    surveyResponseModel: any;
    questionResponseModel: any;
    questionModel: any;
    coreService: any;
    coreLogicService: any;
    surveysService: any;
  }> = {},
) => {
  const surveyResponseModel =
    overrides.surveyResponseModel ||
    ({
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    } as unknown as Model<any>);

  const questionResponseModel =
    overrides.questionResponseModel ||
    ({
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    } as unknown as Model<any>);

  const questionModel =
    overrides.questionModel || ({} as unknown as Model<any>);

  const coreService = overrides.coreService || {
    getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
    getQuestionById: jest.fn().mockResolvedValue({
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    }),
  };

  const coreLogicService = overrides.coreLogicService || {};
  const surveysService = overrides.surveysService || {};

  const service = new UserResponseService(
    surveyResponseModel,
    questionResponseModel,
    questionModel,
    coreService as any,
    coreLogicService as any,
    surveysService as any,
  );

  return { service, surveyResponseModel, questionResponseModel, coreService };
};

describe('UserResponseService option filtering (write-time)', () => {
  it('filters foreign optionIds in updateQuestionResponse', async () => {
    const { service, questionResponseModel, coreService } = makeService();

    // Silence validations by stubbing internal methods
    (service as any)._findSurveyResponseByID = jest
      .fn()
      .mockResolvedValue({ uKey: 'u', uuid: 'uuid' });
    (service as any)._validateSurveyAvaliable = jest.fn();
    (service as any)._validateSKeySetting = jest.fn();
    (service as any)._validateUKeyCorrect = jest.fn();
    (service as any)._validateUUIDCorrect = jest.fn();

    const dto: any = {
      uuid: 'uuid',
      sKey: '',
      uKey: 'u',
      surveyResponseId: new Types.ObjectId(),
      questionResponseId: new Types.ObjectId(),
      surveyId: new Types.ObjectId(),
      questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
      responseContent: {
        votes: [
          { optionId: 'optA', votes: 3 },
          { optionId: 'foreignX', votes: 5 },
          { optionId: 'optB', votes: -1 },
        ],
      },
    };

    await service.updateQuestionResponse(dto);

    expect(coreService.getQuestionById).toHaveBeenCalled();
    expect(questionResponseModel.findByIdAndUpdate).toHaveBeenCalled();
    const args = (questionResponseModel.findByIdAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = args[1];
    expect(Array.isArray(updateDoc.responseContent.votes)).toBe(true);
    const ids = updateDoc.responseContent.votes.map((v: any) => v.optionId);
    expect(ids).toEqual(['optA', 'optB']); // foreignX filtered out
  });

  it('filters in CreateQuestionAndUpdateSurveyResponse existing path', async () => {
    const { service, questionResponseModel, coreService } = makeService();

    (service as any)._validateSurveyAvaliable = jest.fn();
    (service as any)._validateSKeySetting = jest.fn();
    (service as any)._validateUUIDCorrect = jest.fn();
    (service as any)._validateUKeyCorrect = jest.fn();
    (service as any)._findSurveyResponseByUUID = jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      uuid: 'uuid',
      uKey: 'u',
    });
    (service as any)._findQuestionResponseBySurveyAndQuestion = jest
      .fn()
      .mockResolvedValue({ _id: new Types.ObjectId() });
    (service as any)._touchSurveyResponse = jest.fn().mockResolvedValue(null);

    const dto: any = {
      uuid: 'uuid',
      surveyId: new Types.ObjectId(),
      sKey: '',
      uKey: 'u',
      surveyResponseId: new Types.ObjectId(),
      questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
      responseContent: {
        votes: [
          { optionId: 'foreign', votes: 10 },
          { optionId: 'optB', votes: 2 },
        ],
      },
    };

    await service.CreateQuestionAndUpdateSurveyResponse(dto);

    expect(coreService.getQuestionById).toHaveBeenCalled();
    expect(questionResponseModel.findByIdAndUpdate).toHaveBeenCalled();
    const call = (questionResponseModel.findByIdAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = call[1];
    const ids = updateDoc.responseContent.votes.map((v: any) => v.optionId);
    expect(ids).toEqual(['optB']);
  });

  it('filters foreign optionIds in selection responses', async () => {
    const selectionQuestion = {
      type: 'selection',
      selectionMode: 'multi',
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    };
    const { service, questionResponseModel, coreService } = makeService({
      coreService: {
        getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
        getQuestionById: jest.fn().mockResolvedValue(selectionQuestion),
      },
    });

    // Silence validations by stubbing internal methods
    (service as any)._findSurveyResponseByID = jest
      .fn()
      .mockResolvedValue({ uKey: 'u', uuid: 'uuid' });
    (service as any)._validateSurveyAvaliable = jest.fn();
    (service as any)._validateSKeySetting = jest.fn();
    (service as any)._validateUKeyCorrect = jest.fn();
    (service as any)._validateUUIDCorrect = jest.fn();

    const dto: any = {
      uuid: 'uuid',
      sKey: '',
      uKey: 'u',
      surveyResponseId: new Types.ObjectId(),
      questionResponseId: new Types.ObjectId(),
      surveyId: new Types.ObjectId(),
      questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
      responseContent: {
        selectedOptionIds: ['optA', 'foreignX', 'optB', 'optA'],
      },
    };

    await service.updateQuestionResponse(dto);

    expect(coreService.getQuestionById).toHaveBeenCalled();
    expect(questionResponseModel.findByIdAndUpdate).toHaveBeenCalled();
    const args = (questionResponseModel.findByIdAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = args[1];
    expect(Array.isArray(updateDoc.responseContent.selectedOptionIds)).toBe(
      true,
    );
    expect(updateDoc.responseContent.selectedOptionIds).toEqual([
      'optA',
      'optB',
    ]);
  });

  it('rejects approval payloads that exceed configured maxApprovals', async () => {
    const approvalQuestion = {
      type: 'approval',
      maxApprovals: 1,
      unlimitedApprovals: false,
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
        { optionId: 'optC', optionName: 'Option C' },
      ],
    };
    const { service } = makeService({
      coreService: {
        getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
        getQuestionById: jest.fn().mockResolvedValue(approvalQuestion),
      },
    });

    (service as any)._findSurveyResponseByID = jest
      .fn()
      .mockResolvedValue({ uKey: 'u', uuid: 'uuid' });
    (service as any)._validateSurveyAvaliable = jest.fn();
    (service as any)._validateSKeySetting = jest.fn();
    (service as any)._validateUKeyCorrect = jest.fn();
    (service as any)._validateUUIDCorrect = jest.fn();

    const dto: any = {
      uuid: 'uuid',
      sKey: '',
      uKey: 'u',
      surveyResponseId: new Types.ObjectId(),
      questionResponseId: new Types.ObjectId(),
      surveyId: new Types.ObjectId(),
      questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
      responseContent: {
        approvals: ['optA', 'optB'],
      },
    };

    await expect(service.updateQuestionResponse(dto)).rejects.toBeTruthy();
  });

  it('allows approval payloads beyond maxApprovals when unlimitedApprovals is true', async () => {
    const approvalQuestion = {
      type: 'approval',
      maxApprovals: 1,
      unlimitedApprovals: true,
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
        { optionId: 'optC', optionName: 'Option C' },
      ],
    };
    const { service, questionResponseModel } = makeService({
      coreService: {
        getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
        getQuestionById: jest.fn().mockResolvedValue(approvalQuestion),
      },
    });

    (service as any)._findSurveyResponseByID = jest
      .fn()
      .mockResolvedValue({ uKey: 'u', uuid: 'uuid' });
    (service as any)._validateSurveyAvaliable = jest.fn();
    (service as any)._validateSKeySetting = jest.fn();
    (service as any)._validateUKeyCorrect = jest.fn();
    (service as any)._validateUUIDCorrect = jest.fn();

    const dto: any = {
      uuid: 'uuid',
      sKey: '',
      uKey: 'u',
      surveyResponseId: new Types.ObjectId(),
      questionResponseId: new Types.ObjectId(),
      surveyId: new Types.ObjectId(),
      questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
      responseContent: {
        approvals: ['optA', 'optB'],
      },
    };

    await service.updateQuestionResponse(dto);

    const args = (questionResponseModel.findByIdAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = args[1];
    expect(updateDoc.responseContent.approvals).toEqual(['optA', 'optB']);
  });

  it('rejects single-select payloads with multiple selections even when exclusive is present', async () => {
    const selectionQuestion = {
      type: 'selection',
      selectionMode: 'single',
      options: [
        { optionId: 'optA', optionName: 'Option A', isExclusive: true },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    };
    const { service } = makeService({
      coreService: {
        getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
        getQuestionById: jest.fn().mockResolvedValue(selectionQuestion),
      },
    });

    (service as any)._findSurveyResponseByID = jest
      .fn()
      .mockResolvedValue({ uKey: 'u', uuid: 'uuid' });
    (service as any)._validateSurveyAvaliable = jest.fn();
    (service as any)._validateSKeySetting = jest.fn();
    (service as any)._validateUKeyCorrect = jest.fn();
    (service as any)._validateUUIDCorrect = jest.fn();

    const dto: any = {
      uuid: 'uuid',
      sKey: '',
      uKey: 'u',
      surveyResponseId: new Types.ObjectId(),
      questionResponseId: new Types.ObjectId(),
      surveyId: new Types.ObjectId(),
      questionId: new Types.ObjectId('60fd2df04616df0fa280b0b1'),
      responseContent: {
        selectedOptionIds: ['optA', 'optB'],
      },
    };

    await expect(service.updateQuestionResponse(dto)).rejects.toBeTruthy();
  });
});
