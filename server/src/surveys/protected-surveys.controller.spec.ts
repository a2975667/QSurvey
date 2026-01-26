import { Test, TestingModule } from '@nestjs/testing';
import { ProtectedSurveysController } from './protected-surveys.controller';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';

describe('ProtectedSurveysController', () => {
  let controller: ProtectedSurveysController;
  let surveysService: { updateSurveyQuestionsById: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProtectedSurveysController],
      providers: [
        {
          provide: SurveysService,
          useValue: {
            getSurveysForUser: jest.fn(),
            getAllSurveysAdmin: jest.fn(),
            getSurveyResults: jest.fn(),
            findSurveyById: jest.fn(),
            createNewSurvey: jest.fn(),
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
});
