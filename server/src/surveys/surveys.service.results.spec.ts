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

    surveyResponseModel = {
      aggregate: jest.fn(),
    };

    usersService = {};
    coreService = {};
    coreLogicService = {};

    service = new SurveysService(
      surveyModel,
      questionModel,
      qvQuestionModel,
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
    expect(firstPipeline[0]).toEqual(
      expect.objectContaining({
        $match: expect.objectContaining({
          $expr: expect.objectContaining({}),
        }),
      }),
    );

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
    expect(decodedCursor.qr).toBe(secondQuestionResponseId.toString());
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
});
