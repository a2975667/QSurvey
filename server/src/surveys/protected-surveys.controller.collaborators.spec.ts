import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProtectedSurveysController } from './protected-surveys.controller';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Role } from 'src/auth/roles/role.enum';
import { UpdateCollaboratorsDto } from './dtos/updateCollaborators.dto';
import { ModifyCollaboratorDto } from './dtos/modifyCollaborator.dto';

describe('ProtectedSurveysController (collaborators)', () => {
  let controller: ProtectedSurveysController;
  let surveysService: any;
  let validationPipe: ValidationPipe;

  const req = {
    user: {
      userId: new Types.ObjectId(),
      roles: [Role.Designer],
    },
  };
  const surveyId = new Types.ObjectId().toString();

  beforeEach(async () => {
    surveysService = {
      getCollaborators: jest.fn(),
      replaceCollaborators: jest.fn(),
      addCollaborator: jest.fn(),
      removeCollaborator: jest.fn(),
      getSurveysForUser: jest.fn(),
      getAllSurveysAdmin: jest.fn(),
      getSurveyResults: jest.fn(),
      getSurveyResultsGrouped: jest.fn(),
      findSurveyById: jest.fn(),
      createNewSurvey: jest.fn(),
      updateSurveyById: jest.fn(),
      removeSurveyById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProtectedSurveysController],
      providers: [{ provide: SurveysService, useValue: surveysService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = moduleRef.get<ProtectedSurveysController>(
      ProtectedSurveysController,
    );
    validationPipe = new ValidationPipe({ transform: true, whitelist: true });
  });

  const toUpdateDto = async (body: Record<string, any>) =>
    (await validationPipe.transform(body, {
      type: 'body',
      metatype: UpdateCollaboratorsDto,
    })) as UpdateCollaboratorsDto;

  const toModifyDto = async (body: Record<string, any>) =>
    (await validationPipe.transform(body, {
      type: 'body',
      metatype: ModifyCollaboratorDto,
    })) as ModifyCollaboratorDto;

  it('delegates getSurveyCollaborators with user context', async () => {
    surveysService.getCollaborators.mockResolvedValue({
      collaborators: [
        {
          userId: req.user.userId.toString(),
          email: 'self@example.com',
          isSelf: true,
        },
      ],
    });

    const result = await controller.getSurveyCollaborators(
      req as any,
      surveyId,
    );

    expect(surveysService.getCollaborators).toHaveBeenCalledWith(
      req.user.userId,
      req.user.roles,
      surveyId,
    );
    expect(result.collaborators).toHaveLength(1);
  });

  it('validates and delegates replaceSurveyCollaborators', async () => {
    const ids = [new Types.ObjectId().toString(), req.user.userId.toString()];
    const dto = await toUpdateDto({ collaboratorIds: ids });

    await controller.replaceSurveyCollaborators(req as any, surveyId, dto);

    expect(surveysService.replaceCollaborators).toHaveBeenCalledWith(
      req.user.userId,
      req.user.roles,
      surveyId,
      ids,
    );
  });

  it('rejects invalid collaborator ids on replace', async () => {
    await expect(
      toUpdateDto({ collaboratorIds: ['not-an-id'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(surveysService.replaceCollaborators).not.toHaveBeenCalled();
  });

  it('validates and delegates addSurveyCollaborator', async () => {
    const collaboratorId = new Types.ObjectId().toString();
    const dto = await toModifyDto({ userId: collaboratorId });

    await controller.addSurveyCollaborator(req as any, surveyId, dto);

    expect(surveysService.addCollaborator).toHaveBeenCalledWith(
      req.user.userId,
      req.user.roles,
      surveyId,
      collaboratorId,
    );
  });

  it('rejects invalid collaborator id on add', async () => {
    await expect(toModifyDto({ userId: 'invalid-id' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(surveysService.addCollaborator).not.toHaveBeenCalled();
  });

  it('delegates removeSurveyCollaborator with user context', async () => {
    const collaboratorId = new Types.ObjectId().toString();
    await controller.removeSurveyCollaborator(
      req as any,
      surveyId,
      collaboratorId,
    );

    expect(surveysService.removeCollaborator).toHaveBeenCalledWith(
      req.user.userId,
      req.user.roles,
      surveyId,
      collaboratorId,
    );
  });
});
