import { BadRequestException } from '@nestjs/common';
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
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      findById: jest.fn(),
      findOne: jest.fn(),

    } as unknown as Model<any>);

  const questionResponseModel =
    overrides.questionResponseModel ||
    ({
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
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

  const qid = '60fd2df04616df0fa280b0b1';
  const parent = { _id: 'parent', questionResponses: ['child'] };
  const answer = { _id: 'child', questionId: qid, surveyResponseId: 'parent' };
  // These tests isolate content validation. Ownership is covered by the write lifecycle suite.
  jest.spyOn(service as any, 'resolveAnswerWrite').mockResolvedValue({ parent, answer });
  jest.spyOn(service as any, 'getWritableSurvey').mockResolvedValue({ questions: [qid] });
  jest.spyOn(service as any, 'resolveWriteParent').mockResolvedValue(parent);
  jest.spyOn(service as any, 'loadOwnedAnswers').mockResolvedValue([answer]);
  return { service, surveyResponseModel, questionResponseModel, coreService };
};

describe('UserResponseService option filtering (write-time)', () => {
  it('filters foreign optionIds in updateQuestionResponse', async () => {
    const { service, questionResponseModel, coreService } = makeService();

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

    expect(coreService.getQuestionById).toHaveBeenCalledTimes(1);
    expect(questionResponseModel.findOneAndUpdate).toHaveBeenCalled();
    const args = (questionResponseModel.findOneAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = args[1];
    expect(Array.isArray(updateDoc.$set.responseContent.votes)).toBe(true);
    const ids = updateDoc.$set.responseContent.votes.map((v: any) => v.optionId);
    expect(ids).toEqual(['optA', 'optB']); // foreignX filtered out
  });

  it('filters votes when resuming a single-answer save', async () => {
    const { service, questionResponseModel, coreService } = makeService();



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

    await service.saveSingleAnswer(dto);

    expect(coreService.getQuestionById).toHaveBeenCalledTimes(1);
    expect(questionResponseModel.findOneAndUpdate).toHaveBeenCalled();
    const call = (questionResponseModel.findOneAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = call[1];
    const ids = updateDoc.$set.responseContent.votes.map((v: any) => v.optionId);
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
    expect(questionResponseModel.findOneAndUpdate).toHaveBeenCalled();
    const args = (questionResponseModel.findOneAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = args[1];
    expect(Array.isArray(updateDoc.$set.responseContent.selectedOptionIds)).toBe(
      true,
    );
    expect(updateDoc.$set.responseContent.selectedOptionIds).toEqual([
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
    const { service, questionResponseModel } = makeService({
      coreService: {
        getSurveyById: jest.fn().mockResolvedValue({ settings: {} }),
        getQuestionById: jest.fn().mockResolvedValue(approvalQuestion),
      },
    });

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

    const resultPromise = service.updateQuestionResponse(dto);

    await expect(resultPromise).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(resultPromise).rejects.toMatchObject({
      message: expect.stringContaining('[URS0609]'),
    });
    expect(questionResponseModel.findOneAndUpdate).not.toHaveBeenCalled();
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

    const args = (questionResponseModel.findOneAndUpdate as jest.Mock).mock
      .calls[0];
    const updateDoc = args[1];
    expect(updateDoc.$set.responseContent.approvals).toEqual(['optA', 'optB']);
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
