import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from 'src/auth/roles/role.enum';
import { SurveysService } from './surveys.service';
import { SurveyResultsQueryDto } from './dtos/surveyResultsQuery.dto';

describe('SurveysService.getSurveyResults', () => {
  const userId = '60fd2df04616df0fa280b0b1';
  const surveyId = '680f38261354f9f2000e5db8';
  const questionId = '680f39a41354f9f2000e5dd2';

  let surveyModel: any;
  let questionModel: any;
  let qvQuestionModel: any;
  let approvalQuestionModel: any;
  let selectionQuestionModel: any;
  let likertQuestionModel: any;
  let textInputQuestionModel: any;
  let textBlockQuestionModel: any;
  let surveyResponseModel: any;
  let usersService: any;
  let coreService: any;
  let coreLogicService: any;
  let service: SurveysService;

  beforeEach(() => {
    surveyModel = {
      findById: jest.fn().mockReturnValue({
        lean: () =>
          Promise.resolve({
            _id: new Types.ObjectId(surveyId),
            collaborators: [userId],
            questions: [new Types.ObjectId(questionId)],
          }),
      }),
    };

    questionModel = {};
    qvQuestionModel = {};
    approvalQuestionModel = {};
    selectionQuestionModel = {};
    likertQuestionModel = {};
    textInputQuestionModel = {};
    textBlockQuestionModel = {};

    surveyResponseModel = {
      aggregate: jest.fn(),
    };

    usersService = {};
    coreService = {
      getQuestionById: jest.fn().mockResolvedValue({
        options: [
          { optionId: 'optA', optionName: 'Option A' },
          { optionId: 'optB', optionName: 'Option B' },
        ],
      }),
    };
    coreLogicService = {};

    service = new SurveysService(
      surveyModel,
      questionModel,
      qvQuestionModel,
      approvalQuestionModel,
      selectionQuestionModel,
      likertQuestionModel,
      textInputQuestionModel,
      textBlockQuestionModel,
      surveyResponseModel,
      usersService,
      coreService,
      coreLogicService,
    );
  });

  it('returns aggregated totals and paginated raw rows for collaborators', async () => {
    const optionTotals = [
      { _id: 'optA', optionName: 'Option A', sum: 47, voteCount: 9 },
      { _id: 'optB', optionName: 'Option B', sum: -12, voteCount: 9 },
    ];

    const responsesCount = [{ count: 36 }];

    const firstQuestionResponseId = new Types.ObjectId();
    const secondQuestionResponseId = new Types.ObjectId();

    const rawVotes = [
      {
        respondentId: 'uuid-1',
        responseId: 'resp-1',
        optionId: 'optA',
        vote: 5,
        at: new Date('2025-04-28T10:46:13.545Z'),
        questionResponseId: firstQuestionResponseId,
        voteIndex: 0,
      },
      {
        respondentId: 'uuid-2',
        responseId: 'resp-2',
        optionId: 'optB',
        vote: -3,
        at: new Date('2025-04-28T09:40:00.000Z'),
        questionResponseId: secondQuestionResponseId,
        voteIndex: 1,
      },
    ];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(optionTotals) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawVotes) });

    const query: SurveyResultsQueryDto = {
      questionId,
      limit: 1,
    } as any;

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      query,
    );

    expect(surveyModel.findById).toHaveBeenCalledWith(
      new Types.ObjectId(surveyId),
    );

    const firstPipeline = surveyResponseModel.aggregate.mock.calls[0][0];
    expect(firstPipeline[0]).toEqual(
      expect.objectContaining({
        $match: expect.objectContaining({
          $expr: expect.objectContaining({}),
        }),
      }),
    );

    expect(result.meta.questionType).toBe('qv');
    expect(result.meta.optionTotals).toEqual([
      { optionId: 'optA', optionName: 'Option A', sum: 47 },
      { optionId: 'optB', optionName: 'Option B', sum: -12 },
    ]);
    expect(result.meta.grandTotal).toBe(35);
    expect(result.meta.counts).toEqual({
      responses: 36,
      votes: 18,
      statusFilter: 'Complete',
    });
    expect(result.raw).toHaveLength(1);
    expect(result.raw[0]).toEqual({
      respondentId: 'uuid-1',
      responseId: 'resp-1',
      optionId: 'optA',
      vote: 5,
      at: new Date('2025-04-28T10:46:13.545Z').toISOString(),
    });
    expect(result.nextCursor).toBeTruthy();
    const cursor = result.nextCursor;
    if (!cursor) {
      throw new Error('Expected nextCursor to be present');
    }

    const decodedCursor = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf8'),
    );
    expect(decodedCursor.qr).toBe(secondQuestionResponseId.toString());
  });

  it('injects $match to restrict votes to allowed optionIds in both pipelines', async () => {
    const optionTotals = [
      { _id: 'optA', optionName: 'Option A', sum: 10, voteCount: 5 },
      { _id: 'optB', optionName: 'Option B', sum: -2, voteCount: 3 },
    ];
    const responsesCount = [{ count: 8 }];
    const rawVotes: any[] = [];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(optionTotals) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawVotes) });

    const query: SurveyResultsQueryDto = { questionId } as any;
    await service.getSurveyResults(userId, [Role.Designer], surveyId, query);

    const totalsPipeline = surveyResponseModel.aggregate.mock.calls[0][0];
    const rawPipeline = surveyResponseModel.aggregate.mock.calls[2][0];

    // Find a $match stage that enforces optionId in allowed list
    const hasMatchInTotals = totalsPipeline.some(
      (stage: any) =>
        stage?.$match?.['questionResponse.responseContent.votes.optionId']?.$in,
    );
    const hasMatchInRaw = rawPipeline.some(
      (stage: any) =>
        stage?.$match?.['questionResponse.responseContent.votes.optionId']?.$in,
    );
    expect(hasMatchInTotals).toBe(true);
    expect(hasMatchInRaw).toBe(true);
  });

  it('throws for non-collaborators without admin role', async () => {
    surveyModel.findById.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: new Types.ObjectId(surveyId),
          collaborators: [],
          questions: [new Types.ObjectId(questionId)],
        }),
    });

    await expect(
      service.getSurveyResults(userId, [Role.Designer], surveyId, {
        questionId,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(surveyResponseModel.aggregate).not.toHaveBeenCalled();
  });

  it('returns text responses for text questions', async () => {
    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'text',
    });

    const responsesCount = [{ count: 2 }];
    const rawText = [
      {
        respondentId: 'uuid-1',
        responseId: 'resp-1',
        text: 'First answer',
        at: new Date('2025-04-28T10:46:13.545Z'),
        questionResponseId: new Types.ObjectId(),
        voteIndex: 0,
      },
      {
        respondentId: 'uuid-2',
        responseId: 'resp-2',
        text: 'Second answer',
        at: new Date('2025-04-28T09:40:00.000Z'),
        questionResponseId: new Types.ObjectId(),
        voteIndex: 0,
      },
    ];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawText) });

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      { questionId } as any,
    );

    expect(result.meta.questionType).toBe('text');
    expect(result.meta.optionTotals).toEqual([]);
    expect(result.meta.counts.responses).toBe(2);
    expect(result.raw).toHaveLength(2);
    expect(result.raw[0]).toEqual({
      respondentId: 'uuid-1',
      responseId: 'resp-1',
      text: 'First answer',
      at: new Date('2025-04-28T10:46:13.545Z').toISOString(),
    });
  });

  it('returns approval counts for approval questions with zero-filled missing options', async () => {
    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'approval',
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
        { optionId: 'optC', optionName: 'Option C' },
      ],
    });

    const optionTotals = [{ _id: 'optB', sum: 4 }];
    const responsesCount = [{ count: 2 }];
    const questionResponseId = new Types.ObjectId();
    const rawApprovals = [
      {
        respondentId: 'uuid-1',
        responseId: 'resp-1',
        optionId: 'optB',
        at: new Date('2025-04-28T10:46:13.545Z'),
        questionResponseId,
        voteIndex: 0,
      },
    ];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(optionTotals) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawApprovals) });

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      { questionId } as any,
    );

    expect(result.meta.questionType).toBe('approval');
    expect(result.meta.optionTotals).toEqual([
      { optionId: 'optA', optionName: 'Option A', sum: 0 },
      { optionId: 'optB', optionName: 'Option B', sum: 4 },
      { optionId: 'optC', optionName: 'Option C', sum: 0 },
    ]);
    expect(result.meta.counts.responses).toBe(2);
    expect(result.meta.counts.votes).toBe(4);
    expect(result.raw).toHaveLength(1);
    expect(result.raw[0].optionId).toBe('optB');
    expect(result.raw[0].optionName).toBe('Option B');
    expect(result.raw[0].vote).toBe(1);
  });

  it('returns zero-filled approval optionTotals even when there are no responses', async () => {
    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'approval',
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    });

    const optionTotals: any[] = [];
    const responsesCount = [{ count: 0 }];
    const rawApprovals: any[] = [];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(optionTotals) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawApprovals) });

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      { questionId } as any,
    );

    expect(result.meta.questionType).toBe('approval');
    expect(result.meta.optionTotals).toEqual([
      { optionId: 'optA', optionName: 'Option A', sum: 0 },
      { optionId: 'optB', optionName: 'Option B', sum: 0 },
    ]);
    expect(result.meta.grandTotal).toBe(0);
    expect(result.meta.counts.responses).toBe(0);
    expect(result.meta.counts.votes).toBe(0);
    expect(result.raw).toEqual([]);
  });

  it('returns selection counts for selection questions', async () => {
    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'selection',
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    });

    const optionTotals = [
      { _id: 'optA', sum: 4 },
      { _id: 'optB', sum: 2 },
    ];
    const responsesCount = [{ count: 3 }];
    const questionResponseId = new Types.ObjectId();
    const rawSelections = [
      {
        respondentId: 'uuid-1',
        responseId: 'resp-1',
        optionId: 'optA',
        at: new Date('2025-04-28T10:46:13.545Z'),
        questionResponseId,
        voteIndex: 0,
      },
    ];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(optionTotals) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawSelections) });

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      { questionId } as any,
    );

    expect(result.meta.questionType).toBe('selection');
    expect(result.meta.optionTotals).toEqual([
      { optionId: 'optA', optionName: 'Option A', sum: 4 },
      { optionId: 'optB', optionName: 'Option B', sum: 2 },
    ]);
    expect(result.meta.counts.responses).toBe(3);
    expect(result.meta.counts.votes).toBe(6);
    expect(result.raw).toHaveLength(1);
    expect(result.raw[0].optionId).toBe('optA');
    expect(result.raw[0].optionName).toBe('Option A');
    expect(result.raw[0].vote).toBe(1);
  });

  it('returns empty results for text block questions', async () => {
    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'text_block',
    });

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      { questionId } as any,
    );

    expect(result.meta.questionType).toBe('text_block');
    expect(result.meta.optionTotals).toEqual([]);
    expect(result.meta.counts.responses).toBe(0);
    expect(result.raw).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(surveyResponseModel.aggregate).not.toHaveBeenCalled();
  });

  it('returns grouped summaries for surveys', async () => {
    const groupedSurvey = {
      _id: new Types.ObjectId(surveyId),
      collaborators: [userId],
      questions: [new Types.ObjectId(questionId)],
    };
    surveyModel.findById.mockReturnValue({
      lean: () => Promise.resolve(groupedSurvey),
    });

    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'qv',
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    });

    const optionTotals = [
      { _id: 'optA', optionName: 'Option A', sum: 5, voteCount: 3 },
    ];
    const responsesCount = [{ count: 3 }];

    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve(optionTotals) })
      .mockReturnValueOnce({ exec: () => Promise.resolve(responsesCount) });

    const result = await service.getSurveyResultsGrouped(
      userId,
      [Role.Designer],
      surveyId,
      {} as any,
    );

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].questionType).toBe('qv');
    expect(result.questions[0].meta.counts.responses).toBe(3);
  });

  it('requires admin role for global question results', async () => {
    await expect(
      service.getGlobalQuestionResults(userId, [Role.Designer], questionId, {
        status: 'Complete',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
