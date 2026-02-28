import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Role } from 'src/auth/roles/role.enum';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { Question } from 'src/schemas/question.schema';
import {
  ApprovalQuestion,
} from 'src/schemas/questions/approval/approval-question.schema';
import { LikertQuestion } from 'src/schemas/questions/likert/likert.question.schema';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import {
  SelectionQuestion,
} from 'src/schemas/questions/selection/selection-question.schema';
import {
  TextBlockQuestion,
} from 'src/schemas/questions/textBlock/text-block.question.schema';
import {
  TextInputQuestion,
} from 'src/schemas/questions/textInput/text-input.question.schema';
import { SurveyResponse } from 'src/schemas/surveyResponse.schema';
import { Survey } from 'src/schemas/survey.schema';
import { UsersService } from 'src/users/users.service';
import { SurveysService } from './surveys.service';

const createModelMock = () => ({
  find: jest.fn().mockReturnValue({ exec: jest.fn() }),
  aggregate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findById: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    exec: jest.fn(),
  }),
  findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  updateOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn() }),
  deleteMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
  create: jest.fn(),
  db: {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: async (work: () => Promise<void>) => work(),
      endSession: jest.fn().mockResolvedValue(undefined),
    }),
  },
});

describe('SurveysService', () => {
  let service: SurveysService;
  let surveyModel: ReturnType<typeof createModelMock>;
  let questionModel: ReturnType<typeof createModelMock>;
  let qvQuestionModel: ReturnType<typeof createModelMock>;
  let textInputQuestionModel: ReturnType<typeof createModelMock>;
  let coreService: {
    getUserById: jest.Mock;
    getSurveyById: jest.Mock;
    getQuestionsByManyIds: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        { provide: getModelToken(Survey.name), useValue: createModelMock() },
        { provide: getModelToken(Question.name), useValue: createModelMock() },
        { provide: getModelToken(QVQuestion.name), useValue: createModelMock() },
        {
          provide: getModelToken(ApprovalQuestion.name),
          useValue: createModelMock(),
        },
        {
          provide: getModelToken(SelectionQuestion.name),
          useValue: createModelMock(),
        },
        {
          provide: getModelToken(LikertQuestion.name),
          useValue: createModelMock(),
        },
        {
          provide: getModelToken(TextInputQuestion.name),
          useValue: createModelMock(),
        },
        {
          provide: getModelToken(TextBlockQuestion.name),
          useValue: createModelMock(),
        },
        {
          provide: getModelToken(SurveyResponse.name),
          useValue: createModelMock(),
        },
        {
          provide: UsersService,
          useValue: {
            getById: jest.fn(),
            updateUserById: jest.fn(),
          },
        },
        {
          provide: CoreService,
          useValue: {
            getUserById: jest.fn(),
            getSurveyById: jest.fn(),
            getQuestionsByManyIds: jest.fn(),
          },
        },
        {
          provide: CoreLogicService,
          useValue: {
            validateSurveyOwnership: jest.fn().mockReturnValue(true),
            isUserAdmin: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
    surveyModel = module.get(getModelToken(Survey.name));
    questionModel = module.get(getModelToken(Question.name));
    qvQuestionModel = module.get(getModelToken(QVQuestion.name));
    textInputQuestionModel = module.get(getModelToken(TextInputQuestion.name));
    coreService = module.get(CoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deep clones survey and questions with fresh ids', async () => {
    const userId = new Types.ObjectId();
    const sourceSurveyId = new Types.ObjectId();
    const sourceQuestionId = new Types.ObjectId();
    const clonedQuestionId = new Types.ObjectId();
    const clonedSurveyId = new Types.ObjectId();

    surveyModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: sourceSurveyId,
          title: 'Source title',
          description: 'Source description',
          tags: ['alpha'],
          settings: { isAvailable: true },
          collaborators: [userId],
          questions: [sourceQuestionId],
        }),
      }),
      exec: jest.fn(),
    });

    coreService.getQuestionsByManyIds.mockResolvedValue([
      {
        _id: sourceQuestionId,
        type: 'qv',
        question: 'Q1',
        description: 'desc',
        options: [{ optionId: 'A', optionName: 'Option A' }],
        setting: { questionType: 'qv' },
        responses: ['should-not-copy'],
      },
    ]);

    qvQuestionModel.create.mockResolvedValue({ _id: clonedQuestionId });
    surveyModel.create.mockResolvedValue({ _id: clonedSurveyId });

    const result = await service.cloneSurvey(
      userId,
      [Role.Designer],
      sourceSurveyId.toString(),
    );

    expect(qvQuestionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Q1',
        description: 'desc',
        type: 'qv',
      }),
      expect.objectContaining({
        session: expect.anything(),
      }),
    );
    expect(qvQuestionModel.create.mock.calls[0][0]).not.toHaveProperty('_id');
    expect(qvQuestionModel.create.mock.calls[0][0]).not.toHaveProperty(
      'responses',
    );

    expect(surveyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Source title (Cloned)',
        description: 'Source description',
        questions: [clonedQuestionId],
      }),
      expect.objectContaining({
        session: expect.anything(),
      }),
    );
    expect(result).toEqual({ _id: clonedSurveyId });
  });

  it('rejects clone when requester is not admin or collaborator', async () => {
    const requesterId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();
    const sourceSurveyId = new Types.ObjectId();

    surveyModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: sourceSurveyId,
          title: 'Source',
          description: 'Source',
          collaborators: [otherUserId],
          questions: [],
        }),
      }),
      exec: jest.fn(),
    });

    await expect(
      service.cloneSurvey(
        requesterId,
        [Role.Designer],
        sourceSurveyId.toString(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it(
    'does not perform manual cleanup when clone fails mid-flight (relies on rollback)',
    async () => {
    const userId = new Types.ObjectId();
    const sourceSurveyId = new Types.ObjectId();
    const sourceQuestion1 = new Types.ObjectId();
    const sourceQuestion2 = new Types.ObjectId();
    const clonedQuestion1 = new Types.ObjectId();

    surveyModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: sourceSurveyId,
          title: 'Source',
          description: 'Source',
          collaborators: [userId],
          questions: [sourceQuestion1, sourceQuestion2],
        }),
      }),
      exec: jest.fn(),
    });

    coreService.getQuestionsByManyIds.mockResolvedValue([
      {
        _id: sourceQuestion1,
        type: 'qv',
        question: 'Q1',
        setting: { questionType: 'qv' },
      },
      {
        _id: sourceQuestion2,
        type: 'text',
        question: 'Q2',
      },
    ]);

    qvQuestionModel.create.mockResolvedValue({ _id: clonedQuestion1 });
    textInputQuestionModel.create.mockRejectedValue(new Error('boom'));

    await expect(
      service.cloneSurvey(
        userId,
        [Role.Designer],
        sourceSurveyId.toString(),
      ),
    ).rejects.toThrow('boom');

    expect(questionModel.deleteMany).not.toHaveBeenCalled();
    expect(surveyModel.findByIdAndDelete).not.toHaveBeenCalled();
    expect(surveyModel.create).not.toHaveBeenCalled();
  });

  it('fails when source survey does not exist', async () => {
    const userId = new Types.ObjectId();
    const sourceSurveyId = new Types.ObjectId();

    surveyModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      exec: jest.fn(),
    });

    await expect(
      service.cloneSurvey(
        userId,
        [Role.Designer],
        sourceSurveyId.toString(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it(
    'fails clone when question type is unsupported and does not perform explicit cleanup',
    async () => {
    const userId = new Types.ObjectId();
    const sourceSurveyId = new Types.ObjectId();
    const sourceQuestionId = new Types.ObjectId();

    surveyModel.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: sourceSurveyId,
          title: 'Source title',
          description: 'Source description',
          collaborators: [userId],
          questions: [sourceQuestionId],
        }),
      }),
      exec: jest.fn(),
    });

    coreService.getQuestionsByManyIds.mockResolvedValue([
      {
        _id: sourceQuestionId,
        type: 'matrix',
        question: 'Unsupported question',
      },
    ]);

    await expect(
      service.cloneSurvey(
        userId,
        [Role.Designer],
        sourceSurveyId.toString(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(questionModel.deleteMany).not.toHaveBeenCalled();
    expect(surveyModel.findByIdAndDelete).not.toHaveBeenCalled();
    expect(surveyModel.create).not.toHaveBeenCalled();
  });
});
