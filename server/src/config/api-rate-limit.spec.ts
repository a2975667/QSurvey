import {
  createApiRateLimitMiddleware,
  resolveRateLimitTrustProxy,
} from './api-rate-limit';
import { JwtService } from '@nestjs/jwt';
import * as express from 'express';
import { Readable } from 'stream';

const JWT_SECRET = 'test-jwt-secret';
const WRONG_JWT_SECRET = 'wrong-test-jwt-secret';
const jwtService = new JwtService({ secret: JWT_SECRET });
const wrongJwtService = new JwtService({ secret: WRONG_JWT_SECRET });

function createJwt(
  payload: Record<string, unknown>,
  service = jwtService,
): string {
  return service.sign(payload);
}

function createRequest(options: {
  method: string;
  path: string;
  ip?: string;
  body?: any;
  query?: any;
  token?: string;
  tokenPayload?: any;
}): any {
  return {
    method: options.method,
    path: options.path,
    url: options.path,
    ip: options.ip || '203.0.113.10',
    socket: {
      remoteAddress: options.ip || '203.0.113.10',
    },
    body: options.body || {},
    query: options.query || {},
    headers:
      options.token || options.tokenPayload
        ? {
            authorization: `Bearer ${
              options.token || createJwt(options.tokenPayload)
            }`,
          }
        : {},
  };
}

function createResponse(): any {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader: jest.fn(function setHeader(name: string, value: string) {
      this.headers[name] = value;
    }),
    status: jest.fn(function status(code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(body: any) {
      this.body = body;
      return this;
    }),
  };
}

function runMiddleware(middleware: any, req: any) {
  const res = createResponse();
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
}

function createJsonStreamRequest(options: {
  method: string;
  path: string;
  ip?: string;
  body: any;
}): any {
  const rawBody = JSON.stringify(options.body);
  const req = Readable.from([Buffer.from(rawBody)]) as any;
  req.method = options.method;
  req.path = options.path;
  req.url = options.path;
  req.ip = options.ip || '203.0.113.10';
  req.socket = {
    remoteAddress: options.ip || '203.0.113.10',
  };
  req.headers = {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(rawBody).toString(),
  };
  req.query = {};
  return req;
}

async function parseJsonBody(req: any): Promise<void> {
  const parser = express.json();
  await new Promise<void>((resolve, reject) => {
    parser(req, createResponse(), (error: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe('API rate limit middleware', () => {
  const config = {
    auth: { max: 1, windowMs: 60000 },
    protectedWrite: { max: 1, windowMs: 60000 },
    publicRead: { max: 1, windowMs: 60000 },
    publicSubmit: { max: 1, windowMs: 60000 },
    publicSubmitIp: { max: 2, windowMs: 60000 },
    keySalt: 'test-rate-limit-key-salt',
    jwtSecret: JWT_SECRET,
  };

  it('allows a request under the configured endpoint limit', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const req = createRequest({
      method: 'GET',
      path: '/api/v1/surveys/680f38261354f9f2000e5db8',
    });

    const { res, next } = runMiddleware(middleware, req);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a request after the endpoint limit is exceeded', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const req = createRequest({
      method: 'GET',
      path: '/api/v1/google-login',
    });

    runMiddleware(middleware, req);
    const { res, next } = runMiddleware(middleware, req);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });

  it('includes HEAD public survey fetches in the read bucket', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const req = createRequest({
      method: 'HEAD',
      path: '/api/v1/surveys/680f38261354f9f2000e5db8',
    });

    runMiddleware(middleware, req);
    const repeatedRead = runMiddleware(middleware, req);

    expect(repeatedRead.next).not.toHaveBeenCalled();
    expect(repeatedRead.res.status).toHaveBeenCalledWith(429);
  });

  it('keys protected writes by JWT user_id before IP', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstUser = createRequest({
      method: 'POST',
      path: '/api/v1/protected/surveys',
      ip: '203.0.113.20',
      tokenPayload: {
        user_id: 'user-1',
        user_email: 'same-ip@example.com',
      },
    });
    const secondUser = createRequest({
      method: 'POST',
      path: '/api/v1/protected/surveys',
      ip: '203.0.113.20',
      tokenPayload: {
        user_id: 'user-2',
        user_email: 'same-ip@example.com',
      },
    });

    runMiddleware(middleware, firstUser);
    const { res, next } = runMiddleware(middleware, secondUser);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('keys protected writes by JWT user_email when user_id is absent', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstEmail = createRequest({
      method: 'PUT',
      path: '/api/v1/protected/questions/qv/question-1',
      ip: '203.0.113.30',
      tokenPayload: {
        user_email: 'first@example.com',
      },
    });
    const secondEmail = createRequest({
      method: 'PUT',
      path: '/api/v1/protected/questions/qv/question-1',
      ip: '203.0.113.30',
      tokenPayload: {
        user_email: 'second@example.com',
      },
    });

    runMiddleware(middleware, firstEmail);
    const { res, next } = runMiddleware(middleware, secondEmail);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('falls back to the IP bucket when protected route JWTs are not verified', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstInvalidToken = createRequest({
      method: 'POST',
      path: '/api/v1/protected/surveys',
      ip: '203.0.113.34',
      token: createJwt({ user_id: 'forged-user-1' }, wrongJwtService),
    });
    const secondInvalidToken = createRequest({
      method: 'POST',
      path: '/api/v1/protected/surveys',
      ip: '203.0.113.34',
      token: createJwt({ user_id: 'forged-user-2' }, wrongJwtService),
    });

    runMiddleware(middleware, firstInvalidToken);
    const repeatedIp = runMiddleware(middleware, secondInvalidToken);

    expect(repeatedIp.next).not.toHaveBeenCalled();
    expect(repeatedIp.res.status).toHaveBeenCalledWith(429);
  });

  it('limits protected results reads by JWT user_id', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstUser = createRequest({
      method: 'GET',
      path: '/api/v1/protected/surveys/survey-1/results',
      ip: '203.0.113.31',
      tokenPayload: {
        user_id: 'user-1',
      },
    });
    const secondUser = createRequest({
      method: 'GET',
      path: '/api/v1/protected/surveys/survey-1/results',
      ip: '203.0.113.31',
      tokenPayload: {
        user_id: 'user-2',
      },
    });
    const repeatedFirstUser = createRequest({
      method: 'GET',
      path: '/api/v1/protected/surveys/survey-1/results',
      ip: '203.0.113.31',
      tokenPayload: {
        user_id: 'user-1',
      },
    });

    runMiddleware(middleware, firstUser);
    const allowedSecondUser = runMiddleware(middleware, secondUser);
    const blockedFirstUser = runMiddleware(middleware, repeatedFirstUser);

    expect(allowedSecondUser.next).toHaveBeenCalledTimes(1);
    expect(allowedSecondUser.res.status).not.toHaveBeenCalled();
    expect(blockedFirstUser.next).not.toHaveBeenCalled();
    expect(blockedFirstUser.res.status).toHaveBeenCalledWith(429);
  });

  it('does not apply protected write limits to ordinary protected reads', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const req = createRequest({
      method: 'GET',
      path: '/api/v1/protected/surveys',
      ip: '203.0.113.32',
      tokenPayload: {
        user_id: 'user-1',
      },
    });

    runMiddleware(middleware, req);
    const repeatedRead = runMiddleware(middleware, req);

    expect(repeatedRead.next).toHaveBeenCalledTimes(1);
    expect(repeatedRead.res.status).not.toHaveBeenCalled();
  });

  it('limits protected global question result reads', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const req = createRequest({
      method: 'GET',
      path: '/api/v1/protected/questions/question-1/results',
      ip: '203.0.113.33',
      tokenPayload: {
        user_id: 'user-1',
      },
    });

    runMiddleware(middleware, req);
    const repeatedRead = runMiddleware(middleware, req);

    expect(repeatedRead.next).not.toHaveBeenCalled();
    expect(repeatedRead.res.status).toHaveBeenCalledWith(429);
  });

  it('keys public submit/update/complete traffic by surveyId and IP', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstSurvey = createRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.40',
      body: {
        surveyId: 'survey-1',
      },
    });
    const secondSurvey = createRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.40',
      body: {
        surveyId: 'survey-2',
      },
    });

    runMiddleware(middleware, firstSurvey);
    const allowedDifferentSurvey = runMiddleware(middleware, secondSurvey);
    const blockedSameSurvey = runMiddleware(middleware, firstSurvey);

    expect(allowedDifferentSurvey.next).toHaveBeenCalledTimes(1);
    expect(allowedDifferentSurvey.res.status).not.toHaveBeenCalled();
    expect(blockedSameSurvey.next).not.toHaveBeenCalled();
    expect(blockedSameSurvey.res.status).toHaveBeenCalledWith(429);
  });

  it('applies an IP-wide public submit cap across rotated survey IDs', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstSurvey = createRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.42',
      body: {
        surveyId: 'survey-1',
      },
    });
    const secondSurvey = createRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.42',
      body: {
        surveyId: 'survey-2',
      },
    });
    const thirdSurvey = createRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.42',
      body: {
        surveyId: 'survey-3',
      },
    });

    runMiddleware(middleware, firstSurvey);
    const allowedSecondSurvey = runMiddleware(middleware, secondSurvey);
    const blockedThirdSurvey = runMiddleware(middleware, thirdSurvey);

    expect(allowedSecondSurvey.next).toHaveBeenCalledTimes(1);
    expect(allowedSecondSurvey.res.status).not.toHaveBeenCalled();
    expect(blockedThirdSurvey.next).not.toHaveBeenCalled();
    expect(blockedThirdSurvey.res.status).toHaveBeenCalledWith(429);
  });

  it('keys parsed JSON public submit traffic by surveyId and IP', async () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000);
    const firstSurvey = createJsonStreamRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.41',
      body: { surveyId: 'survey-1' },
    });
    const secondSurvey = createJsonStreamRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.41',
      body: { surveyId: 'survey-2' },
    });
    const repeatedFirstSurvey = createJsonStreamRequest({
      method: 'POST',
      path: '/api/v1/survey/responses',
      ip: '203.0.113.41',
      body: { surveyId: 'survey-1' },
    });

    await parseJsonBody(firstSurvey);
    await parseJsonBody(secondSurvey);
    await parseJsonBody(repeatedFirstSurvey);

    runMiddleware(middleware, firstSurvey);
    const allowedDifferentSurvey = runMiddleware(middleware, secondSurvey);
    const blockedSameSurvey = runMiddleware(middleware, repeatedFirstSurvey);

    expect(allowedDifferentSurvey.next).toHaveBeenCalledTimes(1);
    expect(allowedDifferentSurvey.res.status).not.toHaveBeenCalled();
    expect(blockedSameSurvey.next).not.toHaveBeenCalled();
    expect(blockedSameSurvey.res.status).toHaveBeenCalledWith(429);
  });

  it('evicts old buckets when rotating keys exceed the configured cap', () => {
    const middleware = createApiRateLimitMiddleware(config, () => 1000, {
      cleanupIntervalRequests: 1,
      maxBuckets: 2,
    });
    const firstIp = createRequest({
      method: 'GET',
      path: '/api/v1/google-login',
      ip: '203.0.113.50',
    });
    const secondIp = createRequest({
      method: 'GET',
      path: '/api/v1/google-login',
      ip: '203.0.113.51',
    });
    const thirdIp = createRequest({
      method: 'GET',
      path: '/api/v1/google-login',
      ip: '203.0.113.52',
    });

    runMiddleware(middleware, firstIp);
    runMiddleware(middleware, secondIp);
    runMiddleware(middleware, thirdIp);
    const oldestBucketAfterEviction = runMiddleware(middleware, firstIp);

    expect(oldestBucketAfterEviction.next).toHaveBeenCalledTimes(1);
    expect(oldestBucketAfterEviction.res.status).not.toHaveBeenCalled();
  });

  it('keeps trust proxy disabled by default and supports explicit hop count', () => {
    expect(resolveRateLimitTrustProxy({})).toBe(false);
    expect(resolveRateLimitTrustProxy({ RATE_LIMIT_TRUST_PROXY: 'off' })).toBe(
      false,
    );
    expect(resolveRateLimitTrustProxy({ RATE_LIMIT_TRUST_PROXY: '1' })).toBe(1);
  });
});
