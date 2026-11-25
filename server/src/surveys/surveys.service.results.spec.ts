import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { Types } from 'mongoose';
import { UserResponseService } from 'src/response/user-response.service';
import { GetSurveyResponseUuidParamDto } from 'src/response/dto/getCompletedSurveyResponse.dto';
import { UpdateQuestionResponseDto } from 'src/response/dto/updateQuestionResponse.dto';
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

    const result = await service.getSurveyResults(userId, [Role.Designer], surveyId, query);

    expect(surveyModel.findById).toHaveBeenCalledWith(new Types.ObjectId(surveyId));

    const firstPipeline = surveyResponseModel.aggregate.mock.calls[0][0];
    expect(firstPipeline[0].$match).not.toHaveProperty('sKey');
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
    expect(result.meta.counts).toEqual({ responses: 36, votes: 18, statusFilter: 'Complete' });
    expect(result.raw).toHaveLength(1);
    expect(result.raw[0]).toEqual({
      respondentId: 'uuid-1',
      responseId: 'resp-1',
      optionId: 'optA',
      vote: 5,
      at: new Date('2025-04-28T10:46:13.545Z').toISOString(),
    });
    expect(result.nextCursor).toBeTruthy();

    const decodedCursor = JSON.parse(
      Buffer.from(result.nextCursor!, 'base64').toString('utf8'),
    );
    expect(decodedCursor.qr).toBe(firstQuestionResponseId.toString());
  });

  describe('participant chart results', () => {
    const viewer = new Types.ObjectId();
    const peerA = new Types.ObjectId();
    const peerB = new Types.ObjectId();
    const options = [{ optionId: 'A', optionName: 'Alpha' }, { optionId: 'B', optionName: 'Beta' }];
    const at = new Date('2025-04-28T09:40:00.000Z');
    const request = { surveyId, questionId, uuid: 'aab86f57-7ba0-427f-afc5-843c55e2f325', limit: 2 };
    let participant: UserResponseService;

    const rawRow = (responseId: Types.ObjectId, optionId: string, vote: number, respondentId: string) => ({
      responseId: responseId.toHexString(), respondentId, optionId, vote, at,
      questionResponseId: new Types.ObjectId(), voteIndex: 0,
    });
    const queuePage = (rows: ReturnType<typeof rawRow>[]) => {
      const totals = [{ _id: 'A', sum: 4, voteCount: 2 }, { _id: 'B', sum: -1, voteCount: 2 }];
      for (const result of [totals, [{ count: 3 }], rows]) {
        surveyResponseModel.aggregate.mockReturnValueOnce({ exec: async () => result });
      }
    };

    beforeEach(() => {
      coreService.getSurveyResponseByUUID = jest.fn().mockResolvedValue({
        _id: viewer, uuid: request.uuid, surveyId, status: 'Complete', sKey: 'cohort-A',
        questionResponses: [new Types.ObjectId()],
      });
      coreService.getSurveyById = jest.fn().mockResolvedValue({ questions: [questionId] });
      coreService.getQuestionById.mockResolvedValue({ type: 'qv', options });
      coreService.getQuestionResponsesByManyIds = jest.fn().mockResolvedValue([{ questionId }]);
      participant = new UserResponseService(
        surveyResponseModel, {} as any, questionModel, coreService, coreLogicService, service,
        new ConfigService({ JWT_SECRET: 'unit-test-chart-secret' }),
      );
    });

    it('keeps the three respondents distinct and linked across two pages of votes', async () => {
      const rows = [
        rawRow(peerA, 'A', 2, 'old-private-invite'), rawRow(viewer, 'A', 2, request.uuid),
        rawRow(peerA, 'B', -2, 'old-private-invite'), rawRow(peerB, 'B', 1, 'peer-private-uuid'),
      ];
      queuePage(rows.slice(0, 3));
      queuePage(rows.slice(2));
      const first = await participant.getCompletedSurveyAggregates(request);
      const second = await participant.getCompletedSurveyAggregates({ ...request, cursor: first.nextCursor });
      const [a, self, sameA, b] = [...first.raw, ...second.raw];
      expect(first.raw).toHaveLength(2);
      expect(second.raw).toHaveLength(2);
      expect(first.meta).toEqual(second.meta);
      expect(first.meta.grandTotal).toBe(3);
      expect(first.meta.counts.responses).toBe(3);
      expect(first.meta.viewerRespondentId).toBe(self.respondentId);
      expect(a.respondentId).toBe(sameA.respondentId);
      expect(new Set([self.respondentId, a.respondentId, b.respondentId]).size).toBe(3);
      expect([...first.raw, ...second.raw].map(row => [row.optionId, row.vote]))
        .toEqual([['A', 2], ['A', 2], ['B', -2], ['B', 1]]);
      expect(first.nextCursor).toBeTruthy();
      expect(second.nextCursor).toBeNull();
      const payload = JSON.stringify([first, second]);
      for (const row of rows) {
        expect(payload).not.toContain(row.respondentId);
        expect(payload).not.toContain(row.responseId);
        expect(payload).not.toContain(row.questionResponseId.toHexString());
      }
      expect(payload).not.toContain('cohort-A');
      expect(payload).not.toContain(at.toISOString());
      const firstRawPipeline = surveyResponseModel.aggregate.mock.calls[2][0];
      const secondRawPipeline = surveyResponseModel.aggregate.mock.calls[5][0];
      expect(firstRawPipeline[0].$match).toMatchObject({ status: 'Complete', sKey: 'cohort-A' });
      expect(secondRawPipeline.slice(0, 2)).toEqual(firstRawPipeline.slice(0, 2));
      const earlierThan = secondRawPipeline.find(stage => stage.$match?.$expr?.$or?.[0]?.$lt);
      expect(earlierThan.$match.$expr.$or[1].$and[1]).toEqual({
        $lt: ['$questionResponse._id', rows[1].questionResponseId],
      });
      const idParams = Object.assign(new GetSurveyResponseUuidParamDto(), { uuid: a.respondentId });
      expect(validateSync(idParams).some(error => error.property === 'uuid')).toBe(true);
      const write = Object.assign(new UpdateQuestionResponseDto(), { uuid: a.respondentId });
      expect(validateSync(write).some(error => error.property === 'uuid')).toBe(true);

      expect(first.nextCursor).not.toMatch(/[+/=]/);
      const altered = Buffer.from(first.nextCursor, 'base64url');
      altered[altered.length - 1] ^= 1;
      await expect(participant.getCompletedSurveyAggregates({
        ...request, cursor: altered.toString('base64url'),
      })).rejects.toThrow('cursor is invalid');
      coreService.getSurveyResponseByUUID.mockResolvedValue({
        _id: peerB, surveyId, status: 'Complete', sKey: 'cohort-B', questionResponses: [new Types.ObjectId()],
      });
      await expect(participant.getCompletedSurveyAggregates({ ...request, cursor: first.nextCursor }))
        .rejects.toThrow('cursor is invalid');
      coreService.getQuestionById.mockResolvedValue({ type: 'qv', respondentResultsEnabled: false });
      await expect(participant.getCompletedSurveyAggregates({ ...request, cursor: first.nextCursor }))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(surveyResponseModel.aggregate).toHaveBeenCalledTimes(6);
    });

    it.each([
      ['cohort-A', 'cohort-A'], [undefined, { $in: [null, ''] }],
      [null, { $in: [null, ''] }], ['', { $in: [null, ''] }],
    ])('limits every counts, totals and rows query to the stored cohort %p', async (stored, expected) => {
      coreService.getSurveyResponseByUUID.mockResolvedValue({
        _id: viewer, surveyId, status: 'Complete', sKey: stored, questionResponses: [new Types.ObjectId()],
      });
      const cohortKeys = ['cohort-A', 'cohort-B', null, undefined, ''];
      const matchingIndexes = stored ? [0] : [2, 3, 4];
      queuePage([]);
      await participant.getCompletedSurveyAggregates(request);
      for (const [pipeline] of surveyResponseModel.aggregate.mock.calls) {
        const filter = pipeline[0].$match.sKey;
        expect(filter).toEqual(expected);
        const matching = cohortKeys.map((key, i) => {
          const matches = typeof filter === 'string' ? key === filter : filter.$in.includes(key ?? null);
          return matches ? i : -1;
        }).filter(i => i >= 0);
        expect(matching).toEqual(matchingIndexes);
      }
    });

    it('keeps chart IDs stable on refresh and scopes chart IDs and cursors to one question', async () => {
      const otherQuestion = new Types.ObjectId().toHexString();
      coreService.getSurveyById.mockResolvedValue({ questions: [questionId, otherQuestion] });
      coreService.getQuestionResponsesByManyIds.mockResolvedValue([{ questionId }, { questionId: otherQuestion }]);
      const rows = [rawRow(viewer, 'A', 2, request.uuid), rawRow(peerA, 'A', 2, 'peer-capability')];
      for (let i = 0; i < 3; i++) queuePage(rows);
      const first = await participant.getCompletedSurveyAggregates({ ...request, limit: 1 });
      const refreshed = await participant.getCompletedSurveyAggregates({ ...request, limit: 1 });
      const other = await participant.getCompletedSurveyAggregates({ ...request, questionId: otherQuestion, limit: 1 });
      expect(first.raw).toEqual(refreshed.raw);
      expect(first.meta.viewerRespondentId).not.toBe(other.meta.viewerRespondentId);
      await expect(participant.getCompletedSurveyAggregates({
        ...request, questionId: otherQuestion, cursor: first.nextCursor,
      })).rejects.toThrow('cursor is invalid');
      const designerCursor = Buffer.from(JSON.stringify({ t: at, qr: rows[0].questionResponseId, vi: 0 })).toString('base64');
      await expect(participant.getCompletedSurveyAggregates({ ...request, cursor: designerCursor }))
        .rejects.toThrow('cursor is invalid');
      expect(surveyResponseModel.aggregate).toHaveBeenCalledTimes(9);
    });

    it.each(['qv', 'qs', 'quadratic', 'likert', 'selection', 'approval'])(
      'returns only chart identity and answer values for %s', async type => {
        coreService.getQuestionById.mockResolvedValue({ type, options });
        const row = rawRow(viewer, 'A', 1, request.uuid);
        queuePage([row]);
        const result = await participant.getCompletedSurveyAggregates(request);
        if (['qv', 'qs', 'quadratic'].includes(type)) {
          for (const call of [0, 2]) {
            expect(surveyResponseModel.aggregate.mock.calls[call][0]).toContainEqual({
              $match: { 'questionResponse.responseContent.votes.optionId': { $in: ['A', 'B'] } },
            });
          }
        }
        expect(result.meta.viewerRespondentId).toMatch(/^chart-/);
        expect(result.raw).toEqual([{ respondentId: result.meta.viewerRespondentId, optionId: 'A', vote: 1 }]);
      },
    );
  });

  it.each(['qv', 'qs', 'quadratic'])(
    'excludes votes for removed options from survey, grouped and global %s results',
    async (type) => {
      coreService.getQuestionById.mockResolvedValue({
        type, options: [{ optionId: 'current', optionName: 'Current option' }],
      });
      surveyResponseModel.aggregate.mockReturnValue({ exec: async () => [] });

      await service.getSurveyResults(userId, [Role.Designer], surveyId, { questionId });
      await service.getSurveyResultsGrouped(userId, [Role.Designer], surveyId, {});
      await service.getGlobalQuestionResults(userId, [Role.Admin], questionId, {});

      const pipelines = surveyResponseModel.aggregate.mock.calls.map(([pipeline]) => pipeline);
      // Each detail view builds totals and rows. The overview builds just totals.
      const votePipelines = pipelines.filter(pipeline => pipeline.some(stage =>
        stage.$unwind?.path === '$questionResponse.responseContent.votes',
      ));
      expect(votePipelines).toHaveLength(5);
      for (const pipeline of votePipelines) {
        expect(pipeline).toContainEqual({
          $match: { 'questionResponse.responseContent.votes.optionId': { $in: ['current'] } },
        });
      }
    },
  );

  it('scopes results to sKey when one is supplied', async () => {
    surveyResponseModel.aggregate
      .mockReturnValueOnce({ exec: () => Promise.resolve([]) })
      .mockReturnValueOnce({ exec: () => Promise.resolve([{ count: 0 }]) })
      .mockReturnValueOnce({ exec: () => Promise.resolve([]) });

    await service.getSurveyResults(userId, [Role.Designer], surveyId, {
      questionId,
    } as any, { sKey: 'session-1' });

    const totalsPipeline = surveyResponseModel.aggregate.mock.calls[0][0];
    expect(totalsPipeline[0]).toEqual(
      expect.objectContaining({
        $match: expect.objectContaining({
          sKey: 'session-1',
        }),
      }),
    );
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

  it('returns approval counts for approval questions', async () => {
    coreService.getQuestionById = jest.fn().mockResolvedValue({
      type: 'approval',
      options: [
        { optionId: 'optA', optionName: 'Option A' },
        { optionId: 'optB', optionName: 'Option B' },
      ],
    });

    const optionTotals = [
      { _id: 'optA', sum: 3 },
      { _id: 'optB', sum: 1 },
    ];
    const responsesCount = [{ count: 2 }];
    const questionResponseId = new Types.ObjectId();
    const rawApprovals = [
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
      .mockReturnValueOnce({ exec: () => Promise.resolve(rawApprovals) });

    const result = await service.getSurveyResults(
      userId,
      [Role.Designer],
      surveyId,
      { questionId } as any,
    );

    expect(result.meta.questionType).toBe('approval');
    expect(result.meta.optionTotals).toEqual([
      { optionId: 'optA', optionName: 'Option A', sum: 3 },
      { optionId: 'optB', optionName: 'Option B', sum: 1 },
    ]);
    expect(result.meta.counts.responses).toBe(2);
    expect(result.meta.counts.votes).toBe(4);
    expect(result.raw).toHaveLength(1);
    expect(result.raw[0].optionId).toBe('optA');
    expect(result.raw[0].optionName).toBe('Option A');
    expect(result.raw[0].vote).toBe(1);
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
