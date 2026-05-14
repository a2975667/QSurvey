const TRUTHY_ENV_VALUES = new Set(['true', '1', 'yes', 'on']);

export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

export function isTruthyEnv(value?: string): boolean {
  if (value === undefined) {
    return false;
  }

  return TRUTHY_ENV_VALUES.has(value.trim().toLowerCase());
}

function isRuntimeFlagEnabled(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return isTruthyEnv(value);
}

export function isDebugLoggingEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isRuntimeFlagEnabled(env.ENABLE_DEBUG_LOGS, !isProductionEnv(env));
}

export function isSwaggerEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isRuntimeFlagEnabled(env.ENABLE_SWAGGER, !isProductionEnv(env));
}

export function debugLog(...args: unknown[]): void {
  if (isDebugLoggingEnabled()) {
    console.log(...args);
  }
}

export function debugLogLazy(argsFactory: () => unknown[]): void {
  if (isDebugLoggingEnabled()) {
    console.log(...argsFactory());
  }
}
