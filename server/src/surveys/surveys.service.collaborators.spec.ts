import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SurveysService } from './surveys.service';
import { Survey } from 'src/schemas/survey.schema';
import { Question } from 'src/schemas/question.schema';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { SurveyResponse } from 'src/schemas/surveyResponse.schema';
import { UsersService } from 'src/users/users.service';
import { CoreService } from 'src/core/core.service';
import { CoreLogicService } from 'src/core/core-logic.service';
import { Role } from 'src/auth/roles/role.enum';

const createModelMock = () => ({
  findByIdAndUpdate: jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn() }) }),
});

describe('SurveysService collaborator management', () => {
  let service: SurveysService;
  let surveyModel: any;
  let usersService: any;
  let coreService: any;
  let coreLogicService: any;

  const surveyId = new Types.ObjectId();
  const requesterId = new Types.ObjectId();
  const otherId = new Types.ObjectId();

  beforeEach(async () => {
    surveyModel = createModelMock();
    usersService = {
      findUsersByIds: jest.fn().mockResolvedValue([
        { _id: requesterId, email: 'self@example.com' },
        { _id: otherId, email: 'other@example.com' },
      ]),
    };
    coreService = {
      getSurveyById: jest.fn().mockResolvedValue({
        _id: surveyId,
        collaborators: [requesterId],
        questions: [],
      }),
      getUserById: jest.fn().mockResolvedValue({ _id: requesterId, roles: [Role.Designer] }),
    };
    coreLogicService = {
      validateSurveyOwnership: jest.fn().mockReturnValue(true),
      validateContentAvaliable: jest.fn(),
      validateSurveyOpen: jest.fn(),
      validateSurveySKey: jest.fn(),
      requireUkey: jest.fn(),
      mergeIdListWithDocList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        { provide: getModelToken(Survey.name), useValue: surveyModel },
        { provide: getModelToken(Question.name), useValue: {} },
        { provide: getModelToken(QVQuestion.name), useValue: {} },
        { provide: getModelToken(SurveyResponse.name), useValue: {} },
        { provide: UsersService, useValue: usersService },
        { provide: CoreService, useValue: coreService },
        { provide: CoreLogicService, useValue: coreLogicService },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
  });

  it('replaceCollaborators adds requester and dedupes ids', async () => {
    surveyModel.findByIdAndUpdate.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve({ _id: surveyId }),
      }),
    });

    const result = await service.replaceCollaborators(
      requesterId,
      [Role.Designer],
      surveyId.toString(),
      [otherId.toString(), requesterId.toString(), otherId.toHexString()],
    );

    expect(surveyModel.findByIdAndUpdate).toHaveBeenCalledWith(
      surveyId,
      { $set: { collaborators: expect.any(Array) } },
      { new: true },
    );
    expect(result.collaborators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: requesterId.toString(), isSelf: true, email: 'self@example.com' }),
        expect.objectContaining({ userId: otherId.toString(), isSelf: false, email: 'other@example.com' }),
      ]),
    );
  });

  it('getCollaborators returns payload with emails and self flag', async () => {
    const result = await service.getCollaborators(
      requesterId,
      [Role.Designer],
      surveyId.toString(),
    );

    expect(coreLogicService.validateSurveyOwnership).toHaveBeenCalled();
    expect(result.collaborators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: requesterId.toString(), isSelf: true, email: 'self@example.com' }),
      ]),
    );
  });

  it('removeCollaborator keeps requester enforced', async () => {
    surveyModel.findByIdAndUpdate.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve({ _id: surveyId }),
      }),
    });

    const result = await service.removeCollaborator(
      requesterId,
      [Role.Designer],
      surveyId.toString(),
      otherId.toString(),
    );

    expect(result.collaborators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: requesterId.toString(), isSelf: true }),
      ]),
    );
  });
});
