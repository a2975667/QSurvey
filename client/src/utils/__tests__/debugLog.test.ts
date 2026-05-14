import { debugLog, debugLogLazy, isDebugLogEnabled } from '../debugLog';

describe('debugLog utilities', () => {
  const originalEnv = process.env;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
  });

  it('defaults to enabled outside production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.REACT_APP_DEBUG_LOGS;

    expect(isDebugLogEnabled()).toBe(true);
  });

  it('defaults to disabled in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REACT_APP_DEBUG_LOGS;

    expect(isDebugLogEnabled()).toBe(false);
  });

  it('honors explicit production opt-in', () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_DEBUG_LOGS = 'yes';

    expect(isDebugLogEnabled()).toBe(true);
  });

  it('allows explicit development opt-out and fails closed for unknown values', () => {
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_DEBUG_LOGS = 'false';

    expect(isDebugLogEnabled()).toBe(false);

    process.env.REACT_APP_DEBUG_LOGS = 'maybe';

    expect(isDebugLogEnabled()).toBe(false);
  });

  it('does not call console.log when disabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REACT_APP_DEBUG_LOGS;

    debugLog('hidden');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('does not evaluate lazy debug arguments when disabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REACT_APP_DEBUG_LOGS;
    const argsFactory = jest.fn(() => ['hidden']);

    debugLogLazy(argsFactory);

    expect(argsFactory).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
