import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SurveysService } from '../src/surveys/surveys.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles/roles.guard';

describe('Survey management routes (e2e)', () => {
  let app: INestApplication;
  const surveyStub = {
    _id: '507f191e810c19729de860ea',
    title: 'Sample Survey',
    description: 'Survey for testing',
    createdAt: new Date().toISOString(),
    settings: {
      hasSKey: false,
      sKeyValue: '',
      hasUKey: false,
      isAvailable: true,
    },
    questions: [],
  };

  const surveysServiceMock = {
    getAllSurveys: jest.fn().mockResolvedValue([surveyStub]),
    findSurveyById: jest.fn().mockResolvedValue(surveyStub),
    createNewSurvey: jest.fn().mockResolvedValue(surveyStub),
    updateSurveyById: jest.fn().mockResolvedValue(surveyStub),
    updateSurveyPages: jest.fn().mockResolvedValue(surveyStub),
    addSurveyPage: jest.fn().mockResolvedValue(surveyStub),
    updateSurveyPageById: jest.fn().mockResolvedValue(surveyStub),
    deleteSurveyPage: jest.fn().mockResolvedValue(surveyStub),
    reorderSurveyPages: jest.fn().mockResolvedValue(surveyStub),
  };

  const allowAllGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userId: '507f191e810c19729de860ff', roles: ['Admin', 'Designer'] };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SurveysService)
      .useValue(surveysServiceMock)
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a survey and returns the payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .send({
        title: 'Sample Survey',
        description: 'Survey for testing',
        settings: {
          hasSKey: false,
          sKeyValue: '',
          hasUKey: false,
          isAvailable: true,
        },
      })
      .expect(201);

    expect(response.body).toMatchObject({
      _id: surveyStub._id,
      title: 'Sample Survey',
    });
    expect(surveysServiceMock.createNewSurvey).toHaveBeenCalled();
  });

  it('fetches owner survey details via /surveys/:id/owner', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyStub._id}/owner`)
      .expect(200);

    expect(response.body._id).toBe(surveyStub._id);
    expect(surveysServiceMock.findSurveyById).toHaveBeenCalledWith(
      expect.any(String),
      surveyStub._id,
    );
  });
});
