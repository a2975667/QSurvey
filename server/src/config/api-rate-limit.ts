import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { createHmac } from 'crypto';

type RateLimitBucketName =
  | 'auth'
  | 'protectedWrite'
  | 'publicRead'
  | 'publicSubmit'
  | 'publicSubmitIp';

interface RateLimitRule {
  max: number;
  windowMs: number;
}

export interface ApiRateLimitConfig {
  auth: RateLimitRule;
  protectedWrite: RateLimitRule;
  publicRead: RateLimitRule;
  publicSubmit: RateLimitRule;
  publicSubmitIp: RateLimitRule;
  keySalt: string;
  jwtSecret?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface MatchedRateLimit {
  bucket: RateLimitBucketName;
  key: string;
}

type Clock = () => number;

interface ApiRateLimitOptions {
  cleanupIntervalMs?: number;
  cleanupIntervalRequests?: number;
  maxBuckets?: number;
}

const DEFAULT_RATE_LIMITS: ApiRateLimitConfig = {
  auth: {
    max: 30,
    windowMs: 300000,
  },
  protectedWrite: {
    max: 300,
    windowMs: 900000,
  },
  publicRead: {
    max: 1500,
    windowMs: 900000,
  },
  publicSubmit: {
    max: 5000,
    windowMs: 900000,
  },
  publicSubmitIp: {
    max: 20000,
    windowMs: 900000,
  },
  keySalt: 'qsurvey-rate-limit-dev-salt',
};

const DEFAULT_CLEANUP_INTERVAL_MS = 60000;
const DEFAULT_CLEANUP_INTERVAL_REQUESTS = 100;
const DEFAULT_MAX_BUCKETS = 10000;
const logger = new Logger('ApiRateLimit');

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

export function buildApiRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): ApiRateLimitConfig {
  const jwtSecret = env.JWT_SECRET || env.SECRET;

  return {
    auth: {
      max: parsePositiveInteger(
        env.RATE_LIMIT_AUTH_MAX,
        DEFAULT_RATE_LIMITS.auth.max,
      ),
      windowMs: parsePositiveInteger(
        env.RATE_LIMIT_AUTH_WINDOW_MS,
        DEFAULT_RATE_LIMITS.auth.windowMs,
      ),
    },
    protectedWrite: {
      max: parsePositiveInteger(
        env.RATE_LIMIT_PROTECTED_WRITE_MAX,
        DEFAULT_RATE_LIMITS.protectedWrite.max,
      ),
      windowMs: parsePositiveInteger(
        env.RATE_LIMIT_PROTECTED_WRITE_WINDOW_MS,
        DEFAULT_RATE_LIMITS.protectedWrite.windowMs,
      ),
    },
    publicRead: {
      max: parsePositiveInteger(
        env.RATE_LIMIT_PUBLIC_READ_MAX,
        DEFAULT_RATE_LIMITS.publicRead.max,
      ),
      windowMs: parsePositiveInteger(
        env.RATE_LIMIT_PUBLIC_READ_WINDOW_MS,
        DEFAULT_RATE_LIMITS.publicRead.windowMs,
      ),
    },
    publicSubmit: {
      max: parsePositiveInteger(
        env.RATE_LIMIT_PUBLIC_SUBMIT_MAX,
        DEFAULT_RATE_LIMITS.publicSubmit.max,
      ),
      windowMs: parsePositiveInteger(
        env.RATE_LIMIT_PUBLIC_SUBMIT_WINDOW_MS,
        DEFAULT_RATE_LIMITS.publicSubmit.windowMs,
      ),
    },
    publicSubmitIp: {
      max: parsePositiveInteger(
        env.RATE_LIMIT_PUBLIC_SUBMIT_IP_MAX,
        DEFAULT_RATE_LIMITS.publicSubmitIp.max,
      ),
      windowMs: parsePositiveInteger(
        env.RATE_LIMIT_PUBLIC_SUBMIT_IP_WINDOW_MS,
        DEFAULT_RATE_LIMITS.publicSubmitIp.windowMs,
      ),
    },
    keySalt:
      env.RATE_LIMIT_KEY_SALT || jwtSecret || DEFAULT_RATE_LIMITS.keySalt,
    jwtSecret,
  };
}

export function resolveRateLimitTrustProxy(
  env: NodeJS.ProcessEnv = process.env,
): false | number | string | string[] {
  const rawValue = env.RATE_LIMIT_TRUST_PROXY?.trim();
  if (!rawValue || /^(false|0|no|off)$/i.test(rawValue)) {
    return false;
  }

  const numericValue = Number(rawValue);
  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  return rawValue.includes(',')
    ? rawValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : rawValue;
}

function normalizePath(req: Request): string {
  return (req.path || req.url || '').split('?')[0];
}

function getClientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown-ip';
}

function hashRateLimitKeyPart(value: string, salt: string): string {
  return createHmac('sha256', salt).update(value).digest('base64url');
}

function getClientIpKey(req: Request, config: ApiRateLimitConfig): string {
  return `ip_hash:${hashRateLimitKeyPart(getClientIp(req), config.keySalt)}`;
}

function getBearerToken(req: Request): string | null {
  const raw = req.headers?.authorization;
  const authorization = Array.isArray(raw) ? raw[0] : raw;

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function verifyJwtPayload(
  token: string,
  jwtService: JwtService | null,
): any | null {
  if (!jwtService) {
    return null;
  }
  try {
    return jwtService.verify(token);
  } catch (_error) {
    return null;
  }
}

function getProtectedIdentityKey(
  req: Request,
  config: ApiRateLimitConfig,
  jwtService: JwtService | null,
): string {
  const token = getBearerToken(req);
  const payload = token ? verifyJwtPayload(token, jwtService) : null;

  if (payload?.user_id) {
    return `user_id:${String(payload.user_id)}`;
  }

  if (payload?.user_email) {
    return `user_email_hash:${hashRateLimitKeyPart(
      String(payload.user_email).toLowerCase(),
      config.keySalt,
    )}`;
  }

  return getClientIpKey(req, config);
}

function getSurveyId(req: Request): string | null {
  const bodySurveyId = req.body?.surveyId;
  const querySurveyId = req.query?.surveyId;

  if (bodySurveyId) {
    return String(bodySurveyId);
  }

  if (querySurveyId) {
    return Array.isArray(querySurveyId)
      ? String(querySurveyId[0])
      : String(querySurveyId);
  }

  return null;
}

function isProtectedExpensiveRead(path: string, method: string): boolean {
  if (method !== 'GET') {
    return false;
  }

  return (
    /^\/api\/v1\/protected\/surveys\/[^/]+\/results$/.test(path) ||
    /^\/api\/v1\/protected\/questions\/[^/]+\/results$/.test(path) ||
    /^\/api\/v1\/protected\/(?:survey|questions)\/responses(?:\/.*)?$/.test(
      path,
    )
  );
}

function isReadLikeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function matchRateLimits(
  req: Request,
  config: ApiRateLimitConfig,
  jwtService: JwtService | null,
): MatchedRateLimit[] {
  const path = normalizePath(req);
  const method = req.method.toUpperCase();
  const ipKey = getClientIpKey(req, config);

  if (path === '/api/v1/google-login' || path === '/api/v1/redirect') {
    return [
      {
        bucket: 'auth',
        key: ipKey,
      },
    ];
  }

  if (path.startsWith('/api/v1/survey/responses')) {
    if (isReadLikeMethod(method)) {
      return [
        {
          bucket: 'publicRead',
          key: ipKey,
        },
      ];
    }

    const surveyId = getSurveyId(req);
    return [
      {
        bucket: 'publicSubmitIp',
        key: ipKey,
      },
      {
        bucket: 'publicSubmit',
        key: surveyId ? `survey:${surveyId}:${ipKey}` : ipKey,
      },
    ];
  }

  if (isReadLikeMethod(method) && /^\/api\/v1\/surveys\/[^/]+$/.test(path)) {
    return [
      {
        bucket: 'publicRead',
        key: ipKey,
      },
    ];
  }

  if (
    path.startsWith('/api/v1/protected/') &&
    (method !== 'GET' ||
      path.includes('/exports/') ||
      isProtectedExpensiveRead(path, method))
  ) {
    return [
      {
        bucket: 'protectedWrite',
        key: getProtectedIdentityKey(req, config, jwtService),
      },
    ];
  }

  if (path === '/api/v1/profiles' && method !== 'GET') {
    return [
      {
        bucket: 'protectedWrite',
        key: getProtectedIdentityKey(req, config, jwtService),
      },
    ];
  }

  return [];
}

export function createApiRateLimitMiddleware(
  config: ApiRateLimitConfig = buildApiRateLimitConfig(),
  clock: Clock = Date.now,
  options: ApiRateLimitOptions = {},
) {
  const buckets = new Map<string, RateLimitEntry>();
  const jwtService = config.jwtSecret
    ? new JwtService({ secret: config.jwtSecret })
    : null;
  const cleanupIntervalMs = Math.max(
    1000,
    Math.floor(options.cleanupIntervalMs || DEFAULT_CLEANUP_INTERVAL_MS),
  );
  const cleanupIntervalRequests = Math.max(
    1,
    Math.floor(
      options.cleanupIntervalRequests || DEFAULT_CLEANUP_INTERVAL_REQUESTS,
    ),
  );
  const maxBuckets = Math.max(
    1,
    Math.floor(options.maxBuckets || DEFAULT_MAX_BUCKETS),
  );
  let requestCount = 0;

  function cleanupBuckets(now: number): void {
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) {
        buckets.delete(key);
      }
    }

    while (buckets.size > maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      buckets.delete(oldestKey);
    }
  }

  const cleanupTimer = setInterval(
    () => cleanupBuckets(clock()),
    cleanupIntervalMs,
  );
  cleanupTimer.unref?.();

  function consumeBucket(
    match: MatchedRateLimit,
    now: number,
  ): { allowed: boolean; retryAfterSeconds: number } {
    const rule = config[match.bucket];
    const storageKey = `${match.bucket}:${match.key}`;
    const existing = buckets.get(storageKey);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + rule.windowMs,
          };

    entry.count += 1;
    buckets.set(storageKey, entry);

    return {
      allowed: entry.count <= rule.max,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const matches = matchRateLimits(req, config, jwtService);
      if (matches.length === 0) {
        return next();
      }

      const now = clock();
      requestCount += 1;
      if (
        requestCount % cleanupIntervalRequests === 0 ||
        buckets.size >= maxBuckets
      ) {
        cleanupBuckets(now);
      }

      const blockedResult = matches
        .map((match) => consumeBucket(match, now))
        .find((result) => !result.allowed);

      if (buckets.size > maxBuckets) {
        cleanupBuckets(now);
      }

      if (!blockedResult) {
        return next();
      }

      res.setHeader('Retry-After', String(blockedResult.retryAfterSeconds));
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
      });
    } catch (error) {
      logger.warn(
        `Rate limiter failed open: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      next();
    }
  };
}
