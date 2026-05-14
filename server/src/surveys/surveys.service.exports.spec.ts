import { PassThrough } from 'stream';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from 'src/auth/roles/role.enum';
import { SurveysService } from './surveys.service';

const createCursor = (rows: any[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const row of rows) {
      yield row;
    }
  },
  close: jest.fn().mockResolvedValue(undefined),
});

const createCursorWithError = (
  rows: any[],
  errorMessage = 'Cursor failure',
) => ({
  async *[Symbol.asyncIterator]() {
    for (const row of rows) {
      yield row;
    }
    throw new Error(errorMessage);
  },
  close: jest.fn().mockResolvedValue(undefined),
});

const createMockResponse = () => {
  const res = new PassThrough() as any;
  const chunks: Buffer[] = [];
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.headersSent = false;
  const originalWrite = res.write.bind(res);
  res.write = (...args: any[]) => {
    res.headersSent = true;
    return originalWrite(...args);
  };
  res.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });
  const waitForFinish = () =>
    new Promise<void>((resolve) => res.on('finish', () => resolve()));
  const getBuffer = () => Buffer.concat(chunks);
  const getBody = () => getBuffer().toString('utf8');
  return { res, waitForFinish, getBuffer, getBody };
};

describe('SurveysService export streaming', () => {
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
            title: 'Survey A',
            description: 'Desc',
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
        _id: new Types.ObjectId(questionId),
        type: 'qv',
        question: 'Q1',
        description: 'D1',
        options: [{ optionId: 'opt-1', optionName: 'Option 1' }],
        setting: { totalCredits: 100 },
      }),
      getQuestionsByManyIds: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(questionId),
          type: 'qv',
          question: 'Q1',
          description: 'D1',
          options: [{ optionId: 'opt-1', optionName: 'Option 1' }],
          setting: { totalCredits: 100 },
        },
      ]),
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

  it('streams question export JSON with expected envelope', async () => {
    const rows = [
      {
        respondentKey: 'uuid-1',
        uuid: 'uuid-1',
        uKey: 'u-1',
        sKey: 's-1',
        surveyResponseId: 'resp-1',
        status: 'Complete',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-02T00:00:00Z'),
        questionId: new Types.ObjectId(questionId),
        questionResponseId: new Types.ObjectId(),
        createdTime: new Date('2026-01-01T12:00:00Z'),
        derivedAt: new Date('2026-01-01T12:00:00Z'),
        responseContent: { votes: [{ optionId: 'opt-1', votes: 2 }] },
      },
    ];

    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursor(rows),
    });

    const { res, waitForFinish, getBody } = createMockResponse();

    await service.streamSurveyQuestionExport(
      userId,
      [Role.Designer],
      surveyId,
      questionId,
      { status: 'All' },
      res,
    );

    await waitForFinish();

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json',
    );
    const body = getBody();
    const parsed = JSON.parse(body);
    expect(parsed.survey.surveyId).toBe(surveyId);
    expect(parsed.question.questionId).toBe(questionId);
    expect(parsed.question.questionMeta.question).toBe('Q1');
    expect(parsed.responses[questionId]['uuid-1'].uuid).toBe('uuid-1');
  });

  it('streams respondent export as a zip archive', async () => {
    const rows = [
      {
        respondentKey: 'uuid-1',
        uuid: 'uuid-1',
        uKey: 'u-1',
        sKey: 's-1',
        surveyResponseId: 'resp-1',
        status: 'Complete',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-02T00:00:00Z'),
        questionId: new Types.ObjectId(questionId),
        questionResponseId: new Types.ObjectId(),
        createdTime: new Date('2026-01-01T12:00:00Z'),
        derivedAt: new Date('2026-01-01T12:00:00Z'),
        responseContent: { votes: [{ optionId: 'opt-1', votes: 2 }] },
      },
    ];

    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursor(rows),
    });

    const { res, waitForFinish, getBuffer } = createMockResponse();

    await service.streamSurveyRespondentExport(
      userId,
      [Role.Designer],
      surveyId,
      { status: 'All' },
      res,
    );

    await waitForFinish();

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('respondents'),
    );
    const buffer = getBuffer();
    expect(buffer.length).toBeGreaterThan(4);
    expect(buffer.slice(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  });

  it('rejects invalid status filters', async () => {
    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursor([]),
    });

    const { res } = createMockResponse();

    await expect(
      service.streamSurveyQuestionExport(
        userId,
        [Role.Designer],
        surveyId,
        questionId,
        { status: 'InvalidStatus' },
        res,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-collaborator access for respondent export', async () => {
    surveyModel.findById = jest.fn().mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: new Types.ObjectId(surveyId),
          title: 'Survey A',
          description: 'Desc',
          collaborators: ['someone-else'],
          questions: [new Types.ObjectId(questionId)],
        }),
    });

    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursor([]),
    });

    const { res } = createMockResponse();

    await expect(
      service.streamSurveyRespondentExport(
        userId,
        [Role.Designer],
        surveyId,
        { status: 'All' },
        res,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects question exports when question is not in survey', async () => {
    surveyModel.findById = jest.fn().mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: new Types.ObjectId(surveyId),
          title: 'Survey A',
          description: 'Desc',
          collaborators: [userId],
          questions: [new Types.ObjectId()],
        }),
    });

    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursor([]),
    });

    const { res } = createMockResponse();

    await expect(
      service.streamSurveyQuestionExport(
        userId,
        [Role.Designer],
        surveyId,
        questionId,
        { status: 'All' },
        res,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('appends errors when question export streaming fails mid-stream', async () => {
    const rows = [
      {
        respondentKey: 'uuid-1',
        uuid: 'uuid-1',
        uKey: 'u-1',
        sKey: 's-1',
        surveyResponseId: 'resp-1',
        status: 'Complete',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-02T00:00:00Z'),
        questionId: new Types.ObjectId(questionId),
        questionResponseId: new Types.ObjectId(),
        createdTime: new Date('2026-01-01T12:00:00Z'),
        derivedAt: new Date('2026-01-01T12:00:00Z'),
        responseContent: { votes: [{ optionId: 'opt-1', votes: 2 }] },
      },
    ];

    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursorWithError(rows),
    });

    const { res, waitForFinish, getBody } = createMockResponse();

    await service.streamSurveyQuestionExport(
      userId,
      [Role.Designer],
      surveyId,
      questionId,
      { status: 'All' },
      res,
    );

    await waitForFinish();

    const parsed = JSON.parse(getBody());
    expect(parsed.responses[questionId]['uuid-1'].uuid).toBe('uuid-1');
    expect(parsed.errors).toHaveLength(1);
  });

  it('writes an error manifest when respondent export streaming fails', async () => {
    const rows = [
      {
        respondentKey: 'uuid-1',
        uuid: 'uuid-1',
        uKey: 'u-1',
        sKey: 's-1',
        surveyResponseId: 'resp-1',
        status: 'Complete',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-02T00:00:00Z'),
        questionId: new Types.ObjectId(questionId),
        questionResponseId: new Types.ObjectId(),
        createdTime: new Date('2026-01-01T12:00:00Z'),
        derivedAt: new Date('2026-01-01T12:00:00Z'),
        responseContent: { votes: [{ optionId: 'opt-1', votes: 2 }] },
      },
    ];

    surveyResponseModel.aggregate.mockReturnValue({
      cursor: () => createCursorWithError(rows),
    });

    const { res, waitForFinish, getBuffer } = createMockResponse();

    await service.streamSurveyRespondentExport(
      userId,
      [Role.Designer],
      surveyId,
      { status: 'All' },
      res,
    );

    await waitForFinish();

    const buffer = getBuffer();
    expect(
      buffer.indexOf(Buffer.from('__export_errors__.json')),
    ).toBeGreaterThanOrEqual(0);
  });
});
