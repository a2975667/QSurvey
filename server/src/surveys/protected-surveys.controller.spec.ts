import { Test, TestingModule } from '@nestjs/testing';
import { ProtectedSurveysController } from './protected-surveys.controller';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';

describe('ProtectedSurveysController', () => {
  let controller: ProtectedSurveysController;

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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
