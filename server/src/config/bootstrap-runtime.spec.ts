import { SwaggerModule } from '@nestjs/swagger';
import {
  registerDebugRequestLogger,
  registerSpaFallback,
  setupSwaggerIfEnabled,
} from './bootstrap-runtime';

describe('bootstrap runtime helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('does not mount Swagger under production defaults', () => {
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
  });

  it('mounts Swagger when production override is enabled', () => {
    const app = {} as any;
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
  });

  it('does not emit request URL logs when debug logging is disabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_DEBUG_LOGS;
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const next = jest.fn();
    let middleware: any;
    const expressApp = {
      use: jest.fn((handler) => {
        middleware = handler;
      }),
    };

    registerDebugRequestLogger(expressApp);
    middleware({ method: 'GET', url: '/survey/abc?uuid=secret' }, {}, next);

    expect(next).toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('emits request URL logs when debug logging is enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEBUG_LOGS = 'true';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const next = jest.fn();
    let middleware: any;
    const expressApp = {
      use: jest.fn((handler) => {
        middleware = handler;
      }),
    };

    registerDebugRequestLogger(expressApp);
    middleware({ method: 'GET', url: '/survey/abc?uuid=secret' }, {}, next);

    expect(next).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[DEBUG] Incoming request: GET /survey/abc?uuid=secret',
    );
  });

  it.each([
    ['/api/v1/surveys?uuid=secret', 'GET', true],
    ['/surveys/abc?uuid=secret', 'GET', true],
    ['/designer?uuid=secret', 'GET', false],
  ])(
    'does not emit SPA fallback URL logs for %s when debug logging is disabled',
    (url, method, expectsNext) => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_DEBUG_LOGS;
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const next = jest.fn();
      const sendFile = jest.fn();
      let middleware: any;
      const expressApp = {
        use: jest.fn((handler) => {
          middleware = handler;
        }),
      };

      registerSpaFallback(expressApp);
      middleware({ method, url }, { sendFile }, next);

      if (expectsNext) {
        expect(next).toHaveBeenCalled();
        expect(sendFile).not.toHaveBeenCalled();
      } else {
        expect(next).not.toHaveBeenCalled();
        expect(sendFile).toHaveBeenCalled();
      }
      expect(consoleLogSpy).not.toHaveBeenCalled();
    },
  );
});
