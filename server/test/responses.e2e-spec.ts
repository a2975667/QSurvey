import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserResponseService } from '../src/response/user-response.service';

describe('User response routes (e2e)', () => {
  let app: INestApplication;

  const userResponseServiceMock = {
    createSurveyAndQuestionResponse: jest.fn().mockResolvedValue({
      surveyResponseId: '507f191e810c19729de860ef',
      uuid: 'b1382a6e-853b-4f40-a87f-56d3c0175e8f',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserResponseService)
      .useValue(userResponseServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates initial survey response', async () => {
    const payload = {
      IsNewSurveyResponse: true,
      surveyId: '507f191e810c19729de860ea',
      questionId: '507f191e810c19729de860eb',
      responseContent: {
        votes: [
          { optionId: 'opt-1', optionName: 'Option 1', votes: 2 },
          { optionId: 'opt-2', optionName: 'Option 2', votes: -2 },
        ],
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/survey/responses')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      surveyResponseId: '507f191e810c19729de860ef',
      uuid: expect.any(String),
    });
    expect(
      userResponseServiceMock.createSurveyAndQuestionResponse,
    ).toHaveBeenCalledWith(payload);
  });
});
