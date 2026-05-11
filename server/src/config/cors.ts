import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const LOCAL_DEV_ORIGIN = 'http://localhost:3000';

export type CorsOriginSource =
  | 'allowed-origins'
  | 'frontend-url'
  | 'local-dev-default'
  | 'none';

export interface CorsConfig {
  allowedOrigins: string[];
  options: CorsOptions;
  source: CorsOriginSource;
}

export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '*') {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === 'null') {
      return null;
    }
    return url.origin;
  } catch (_) {
    return null;
  }
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const origins = raw
    .split(',')
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  return Array.from(new Set(origins));
}

export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env): {
  allowedOrigins: string[];
  source: CorsOriginSource;
} {
  if (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.trim()) {
    return {
      allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
      source: 'allowed-origins',
    };
  }

  const frontendOrigins = parseAllowedOrigins(env.FRONTEND_URL);
  if (frontendOrigins.length > 0) {
    return {
      allowedOrigins: frontendOrigins,
      source: 'frontend-url',
    };
  }

  if (env.NODE_ENV !== 'production') {
    return {
      allowedOrigins: [LOCAL_DEV_ORIGIN],
      source: 'local-dev-default',
    };
  }

  return {
    allowedOrigins: [],
    source: 'none',
  };
}

export function buildCorsConfig(
  env: NodeJS.ProcessEnv = process.env,
): CorsConfig {
  const { allowedOrigins, source } = resolveAllowedOrigins(env);
  const allowedOriginSet = new Set(allowedOrigins);

  return {
    allowedOrigins,
    source,
    options: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOrigin(origin);
        if (normalizedOrigin && allowedOriginSet.has(normalizedOrigin)) {
          callback(null, normalizedOrigin);
          return;
        }

        callback(null, false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    },
  };
}
