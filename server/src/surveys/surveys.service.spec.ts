import { Test, TestingModule } from '@nestjs/testing';
import { SurveysService } from './surveys.service';
import { getModelToken } from '@nestjs/mongoose';
import { Survey } from 'src/schemas/survey.schema';
import { Question } from 'src/schemas/question.schema';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { SurveyResponse } from 'src/schemas/surveyResponse.schema';
import { UsersService } from 'src/users/users.service';
import { CoreService } from 'src/core/core.service';
import { CoreLogicService } from 'src/core/core-logic.service';

const createModelMock = () => ({
  find: jest.fn().mockReturnValue({ exec: jest.fn() }),
  aggregate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findById: jest
    .fn()
    .mockReturnValue({ exec: jest.fn(), lean: jest.fn().mockReturnValue(null) }),
  findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  updateOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  create: jest.fn(),
});

describe('SurveysService', () => {
  let service: SurveysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        { provide: getModelToken(Survey.name), useValue: createModelMock() },
        { provide: getModelToken(Question.name), useValue: createModelMock() },
        { provide: getModelToken(QVQuestion.name), useValue: createModelMock() },
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
