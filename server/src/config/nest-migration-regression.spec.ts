import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { FrontendController } from '../frontend.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import {
  registerSpaFallback,
  setupSwaggerIfEnabled,
} from './bootstrap-runtime';
import { buildCorsConfig } from './cors';
import { ProtectedSurveysController } from '../surveys/protected-surveys.controller';
import { SurveysController } from '../surveys/surveys.controller';
import { SurveysService } from '../surveys/surveys.service';

describe('Nest/Express migration regression surface (e2e)', () => {
  let app: INestApplication;
  let authController: AuthController;
  let frontendController: FrontendController;
  let appRoot: string;
  let buildDir: string;
  let frontendControllerIndexPath: string;
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

  const authServiceMock = {
    googleLogin: jest.fn().mockReturnValue({
      access_token: 'migration-token',
      user: {
        email: 'migration@example.com',
        id: '507f191e810c19729de860aa',
        roles: ['Designer'],
      },
    }),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') {
        return 'https://frontend.example.test';
      }
      return undefined;
    }),
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
      FRONTEND_URL: 'https://frontend.example.test',
      ALLOWED_ORIGINS: 'https://frontend.example.test',
    };
    appRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'qsurvey-nest-migration-app-'),
    );
    buildDir = path.join(appRoot, 'build');
    frontendControllerIndexPath = path.join(
      __dirname,
      '..',
      '..',
      'build',
      'index.html',
    );
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
    fs.writeFileSync(
      path.join(appRoot, 'outside-build-root.txt'),
      'outside build root',
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
      controllers: [
        AuthController,
        FrontendController,
        ProtectedSurveysController,
        SurveysController,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
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

    app = moduleFixture.createNestApplication({ logger: false });
    authController = moduleFixture.get<AuthController>(AuthController);
    frontendController =
      moduleFixture.get<FrontendController>(FrontendController);
    app.enableCors(buildCorsConfig(process.env).options);
    app.useGlobalPipes(new ValidationPipe());

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(express.json());
    expressApp.use(express.urlencoded({ extended: true }));
    expressApp.post('/api/v1/body-echo', (req, res) => {
      res.status(201).json(req.body);
    });
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

  it('keeps deep API misses excluded from the SPA fallback', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/foo/bar/baz')
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

  it.each([
    ['root', () => frontendController.serveFrontend],
    ['survey', () => frontendController.serveSurvey],
    ['survey complete', () => frontendController.serveSurveyComplete],
    ['designer', () => frontendController.serveDesigner],
    ['login', () => frontendController.serveLogin],
    ['home', () => frontendController.serveHome],
  ])('keeps FrontendController %s handler on the production build path', (_, getHandler) => {
    const res = { sendFile: jest.fn() };

    getHandler().call(frontendController, res);

    expect(res.sendFile).toHaveBeenCalledWith(frontendControllerIndexPath);
  });

  it('serves static assets from the configured build root', async () => {
    const response = await request(app.getHttpServer())
      .get('/static/app.js')
      .expect(200);

    expect(response.type).toMatch(/javascript/);
    expect(response.text).toContain('__qsurvey_static_asset__');
  });

  it('does not serve traversal paths outside the configured build root', async () => {
    const response = await request(app.getHttpServer()).get(
      '/static/..%2Foutside-build-root.txt',
    );

    expect([400, 404]).toContain(response.status);
    expect(response.text).not.toContain('outside build root');
  });

  it('sends CORS headers for the configured browser origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/static/app.js')
      .set('Origin', 'https://frontend.example.test')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://frontend.example.test',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not send CORS allow-origin headers for disallowed origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/static/app.js')
      .set('Origin', 'https://attacker.example.test')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
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

  it('keeps auth redirect callbacks on the configured frontend login-success route', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const req = { user: { id: 'google-user' } };
    const res = { redirect: jest.fn() };

    authController.googleAuthRedirect(req, res);

    expect(authServiceMock.googleLogin).toHaveBeenCalledWith(req);
    expect(configServiceMock.get).toHaveBeenCalledWith('FRONTEND_URL');
    expect(res.redirect).toHaveBeenCalledWith(
      'https://frontend.example.test/login-success?token=migration-token&email=migration%40example.com&userId=507f191e810c19729de860aa&roles=%5B%22Designer%22%5D',
    );
    consoleLogSpy.mockRestore();
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

  it('parses URL-encoded nested request bodies with extended syntax', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/body-echo')
      .type('form')
      .send(
        'title=Encoded+Survey&settings[hasSKey]=false&settings[hasUKey]=true&settings[isAvailable]=true',
      )
      .expect(201);

    expect(response.body).toEqual({
      title: 'Encoded Survey',
      settings: {
        hasSKey: 'false',
        hasUKey: 'true',
        isAvailable: 'true',
      },
    });
  });

  it('rejects oversized JSON bodies before controller validation', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/protected/surveys')
        .set('Content-Type', 'application/json')
        .send(
          JSON.stringify({
            title: 'Oversized Migration Survey',
            description: 'x'.repeat(110 * 1024),
            settings: {
              hasSKey: false,
              hasUKey: false,
              isAvailable: true,
            },
          }),
        );

      expect(response.status).toBe(413);
      expect(response.text).not.toContain('QSurvey SPA');
      expect(surveysServiceMock.createNewSurvey).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
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

  it('keeps Swagger disabled under production defaults', () => {
    const createDocumentSpy = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({} as any);
    const setupSpy = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    const mounted = setupSwaggerIfEnabled({} as any, {
      NODE_ENV: 'production',
    });

    expect(mounted).toBe(false);
    expect(createDocumentSpy).not.toHaveBeenCalled();
    expect(setupSpy).not.toHaveBeenCalled();
    createDocumentSpy.mockRestore();
    setupSpy.mockRestore();
  });

  it('mounts Swagger when explicitly enabled in production', () => {
    const document = { openapi: '3.0.0' } as any;
    const createDocumentSpy = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document);
    const setupSpy = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    const mounted = setupSwaggerIfEnabled(app, {
      NODE_ENV: 'production',
      ENABLE_SWAGGER: 'true',
    });

    expect(mounted).toBe(true);
    expect(createDocumentSpy).toHaveBeenCalledWith(app, expect.any(Object));
    expect(setupSpy).toHaveBeenCalledWith('api', app, document);
    createDocumentSpy.mockRestore();
    setupSpy.mockRestore();
  });
});
