import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ServeStaticModule } from '@nestjs/serve-static';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { registerSpaFallback } from './bootstrap-runtime';
import { ProtectedSurveysController } from '../surveys/protected-surveys.controller';
import { SurveysController } from '../surveys/surveys.controller';
import { SurveysService } from '../surveys/surveys.service';

describe('Nest/Express migration regression surface (e2e)', () => {
  let app: INestApplication;
  let appRoot: string;
  let buildDir: string;
  let cwdSpy: jest.SpyInstance<string, []>;
  const originalEnv = process.env;

  const surveyStub = {
    _id: '507f191e810c19729de860ea',
    title: 'Migration Survey',
    description: 'Survey for Nest migration tests',
    settings: {
      hasSKey: false,
      sKeyValue: '',
      hasUKey: false,
      isAvailable: true,
    },
    questions: [],
  };

  const surveysServiceMock = {
    createNewSurvey: jest.fn().mockResolvedValue(surveyStub),
    servePublicSurveyById: jest.fn().mockResolvedValue(surveyStub),
  };

  const allowAllGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: '507f191e810c19729de860ff',
        roles: ['Admin', 'Designer'],
      };
      return true;
    },
  };

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      ENABLE_DEBUG_LOGS: 'false',
    };
    appRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'qsurvey-nest-migration-app-'),
    );
    buildDir = path.join(appRoot, 'build');
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(appRoot);
    fs.mkdirSync(path.join(buildDir, 'static'), { recursive: true });
    fs.writeFileSync(
      path.join(buildDir, 'index.html'),
      '<!doctype html><html><body><div id="root">QSurvey SPA</div></body></html>',
    );
    fs.writeFileSync(
      path.join(buildDir, 'static', 'app.js'),
      'window.__qsurvey_static_asset__ = true;',
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ServeStaticModule.forRoot({
          rootPath: buildDir,
          exclude: ['/api/*splat'],
          serveStaticOptions: {
            index: false,
          },
        }),
      ],
      controllers: [ProtectedSurveysController, SurveysController],
      providers: [
        {
          provide: SurveysService,
          useValue: surveysServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(express.json());
    expressApp.use(express.urlencoded({ extended: true }));
    registerSpaFallback(expressApp);
    expressApp.use(express.static(buildDir));

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    cwdSpy.mockRestore();
    process.env = originalEnv;
    fs.rmSync(appRoot, { recursive: true, force: true });
  });

  it('keeps API misses as JSON 404s instead of serving the SPA fallback', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404);

    expect(response.type).toMatch(/json/);
    expect(response.text).not.toContain('QSurvey SPA');
  });

  it.each(['/designer', '/survey/example-id/complete', '/login-success'])(
    'serves the SPA fallback for frontend route %s',
    async (route) => {
      const response = await request(app.getHttpServer())
        .get(route)
        .expect(200);

      expect(response.type).toMatch(/html/);
      expect(response.text).toContain('QSurvey SPA');
    },
  );

  it('serves static assets from the configured build root', async () => {
    const response = await request(app.getHttpServer())
      .get('/static/app.js')
      .expect(200);

    expect(response.type).toMatch(/javascript/);
    expect(response.text).toContain('__qsurvey_static_asset__');
  });

  it('keeps existing API route matching through the /api/v1 prefix', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyStub._id}?uuid=response-uuid`)
      .expect(200);

    expect(response.body).toMatchObject({
      _id: surveyStub._id,
      title: surveyStub.title,
    });
    expect(surveysServiceMock.servePublicSurveyById).toHaveBeenCalledWith(
      surveyStub._id,
      undefined,
      undefined,
      'response-uuid',
    );
  });

  it('parses valid JSON request bodies before controller validation', async () => {
    const payload = {
      title: 'Migration Survey',
      description: 'Survey for Nest migration tests',
      settings: {
        hasSKey: false,
        hasUKey: false,
        isAvailable: true,
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/protected/surveys')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      _id: surveyStub._id,
      title: surveyStub.title,
    });
    expect(surveysServiceMock.createNewSurvey).toHaveBeenCalledWith(
      '507f191e810c19729de860ff',
      expect.objectContaining(payload),
    );
  });

  it('rejects malformed JSON with a controlled 400 response', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/protected/surveys')
      .set('Content-Type', 'application/json')
      .send('{"title":')
      .expect(400);

    expect(response.type).toMatch(/json/);
    expect(surveysServiceMock.createNewSurvey).not.toHaveBeenCalled();
  });

  it('keeps global ValidationPipe rejection behavior for invalid DTOs', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/protected/surveys')
      .send({
        description: 'Missing title should fail validation',
        settings: {
          hasSKey: false,
          hasUKey: false,
          isAvailable: true,
        },
      })
      .expect(400);

    expect(response.type).toMatch(/json/);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'title should not be empty',
        'title must be a string',
      ]),
    );
    expect(surveysServiceMock.createNewSurvey).not.toHaveBeenCalled();
  });
});
