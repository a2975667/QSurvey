import { Test, TestingModule } from '@nestjs/testing';
import {
  ProtectedSurveyTemplatesController,
  ProtectedSurveysController,
} from './protected-surveys.controller';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';

describe('ProtectedSurveysController', () => {
  let controller: ProtectedSurveysController;
  let templateController: ProtectedSurveyTemplatesController;
  let surveysService: {
    updateSurveyQuestionsById: jest.Mock;
    cloneSurvey: jest.Mock;
    cloneSurveyTemplate: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        ProtectedSurveysController,
        ProtectedSurveyTemplatesController,
      ],
      providers: [
        {
          provide: SurveysService,
          useValue: {
            getSurveysForUser: jest.fn(),
            getAllSurveysAdmin: jest.fn(),
            getSurveyResults: jest.fn(),
            findSurveyById: jest.fn(),
            createNewSurvey: jest.fn(),
            cloneSurvey: jest.fn(),
            cloneSurveyTemplate: jest.fn(),
            updateSurveyById: jest.fn(),
            updateSurveyQuestionsById: jest.fn(),
            removeSurveyById: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ProtectedSurveysController>(
      ProtectedSurveysController,
    );
    templateController = module.get<ProtectedSurveyTemplatesController>(
      ProtectedSurveyTemplatesController,
    );
    surveysService = module.get(SurveysService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates question order updates', async () => {
    const req = { user: { userId: 'user-1' } } as any;
    const surveyId = 'survey-123' as any;
    const dto = { questions: ['q-1', 'q-2'] } as any;

    await controller.updateSurveyQuestionOrder(req, surveyId, dto);

    expect(surveysService.updateSurveyQuestionsById).toHaveBeenCalledWith(
      'user-1',
      surveyId,
      dto,
    );
  });

  it('delegates survey clone endpoint', async () => {
    const req = { user: { userId: 'user-1', roles: ['designer'] } } as any;
    const surveyId = 'survey-123';

    await controller.cloneSurvey(req, surveyId);

    expect(surveysService.cloneSurvey).toHaveBeenCalledWith(
      'user-1',
      ['designer'],
      surveyId,
    );
  });

  it('delegates survey template clone endpoint', async () => {
    const req = { user: { userId: 'user-1', roles: ['designer'] } } as any;
    const templateId = '6a023b1ada049d7ebee72017';

    await templateController.cloneSurveyTemplate(req, templateId);

    expect(surveysService.cloneSurveyTemplate).toHaveBeenCalledWith(
      'user-1',
      ['designer'],
      templateId,
    );
  });
});
