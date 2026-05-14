const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);

const isTruthyEnv = (value?: string): boolean => {
  if (value === undefined) {
    return false;
  }

  return TRUTHY_VALUES.has(value.trim().toLowerCase());
};

export const isDebugLogEnabled = (): boolean => {
  const override = process.env.REACT_APP_DEBUG_LOGS;
  if (override !== undefined) {
    return isTruthyEnv(override);
  }

  return process.env.NODE_ENV !== 'production';
};

export const debugLog = (...args: unknown[]): void => {
  if (isDebugLogEnabled()) {
    console.log(...args);
  }
};

export const debugLogLazy = (argsFactory: () => unknown[]): void => {
  if (isDebugLogEnabled()) {
    console.log(...argsFactory());
  }
};
