import {
  debugLog,
  debugLogLazy,
  isDebugLoggingEnabled,
  isProductionEnv,
  isSwaggerEnabled,
  isTruthyEnv,
} from './runtime-flags';

describe('runtime flags', () => {
  describe('isProductionEnv', () => {
    it('detects production exactly', () => {
      expect(isProductionEnv({ NODE_ENV: 'production' })).toBe(true);
      expect(isProductionEnv({ NODE_ENV: 'development' })).toBe(false);
      expect(isProductionEnv({})).toBe(false);
    });
  });

  describe('isTruthyEnv', () => {
    it('accepts explicit truthy values case-insensitively', () => {
      expect(isTruthyEnv('true')).toBe(true);
      expect(isTruthyEnv('1')).toBe(true);
      expect(isTruthyEnv('YES')).toBe(true);
      expect(isTruthyEnv(' on ')).toBe(true);
    });

    it('treats falsey, missing, and unrecognized explicit values as false', () => {
      expect(isTruthyEnv(undefined)).toBe(false);
      expect(isTruthyEnv('false')).toBe(false);
      expect(isTruthyEnv('0')).toBe(false);
      expect(isTruthyEnv('no')).toBe(false);
      expect(isTruthyEnv('off')).toBe(false);
      expect(isTruthyEnv('maybe')).toBe(false);
    });
  });

  describe('production-safe defaults', () => {
    it('disables debug logs and Swagger in production when flags are unset', () => {
      const env = { NODE_ENV: 'production' };

      expect(isDebugLoggingEnabled(env)).toBe(false);
      expect(isSwaggerEnabled(env)).toBe(false);
    });

    it('enables debug logs and Swagger outside production when flags are unset', () => {
      expect(isDebugLoggingEnabled({ NODE_ENV: 'development' })).toBe(true);
      expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
      expect(isDebugLoggingEnabled({})).toBe(true);
      expect(isSwaggerEnabled({})).toBe(true);
    });
  });

  describe('explicit overrides', () => {
    it('allows production operators to opt in with truthy flags', () => {
      const env = {
        NODE_ENV: 'production',
        ENABLE_DEBUG_LOGS: 'true',
        ENABLE_SWAGGER: 'on',
      };

      expect(isDebugLoggingEnabled(env)).toBe(true);
      expect(isSwaggerEnabled(env)).toBe(true);
    });

    it('allows development users to force flags off', () => {
      const env = {
        NODE_ENV: 'development',
        ENABLE_DEBUG_LOGS: 'false',
        ENABLE_SWAGGER: '0',
      };

      expect(isDebugLoggingEnabled(env)).toBe(false);
      expect(isSwaggerEnabled(env)).toBe(false);
    });

    it('fails closed for unrecognized explicit values', () => {
      const env = {
        NODE_ENV: 'development',
        ENABLE_DEBUG_LOGS: 'maybe',
        ENABLE_SWAGGER: 'later',
      };

      expect(isDebugLoggingEnabled(env)).toBe(false);
      expect(isSwaggerEnabled(env)).toBe(false);
    });
  });

  describe('debugLog', () => {
    const originalEnv = process.env;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      process.env = { ...originalEnv };
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleLogSpy.mockRestore();
    });

    it('does not emit debug logs when disabled', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_DEBUG_LOGS;

      debugLog('[DEBUG] hidden');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('emits debug logs when enabled', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEBUG_LOGS = 'true';

      debugLog('[DEBUG] visible', { id: 'example' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] visible', {
        id: 'example',
      });
    });

    it('does not evaluate lazy debug arguments when disabled', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_DEBUG_LOGS;
      const argsFactory = jest.fn(() => ['hidden']);

      debugLogLazy(argsFactory);

      expect(argsFactory).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('evaluates lazy debug arguments when enabled', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEBUG_LOGS = 'true';
      const argsFactory = jest.fn(() => ['visible', { id: 'example' }]);

      debugLogLazy(argsFactory);

      expect(argsFactory).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('visible', {
        id: 'example',
      });
    });
  });
});
