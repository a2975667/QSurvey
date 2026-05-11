import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import {
  buildCorsConfig,
  normalizeOrigin,
  parseAllowedOrigins,
  resolveAllowedOrigins,
} from './cors';

type OriginCallback = Exclude<
  CorsOptions['origin'],
  boolean | string | RegExp | (string | RegExp)[]
>;

function evaluateOrigin(
  options: CorsOptions,
  origin?: string,
): boolean | string | RegExp | (string | RegExp)[] | undefined {
  let result: boolean | string | RegExp | (string | RegExp)[] | undefined;
  const originCallback = options.origin as OriginCallback;

  originCallback(origin as string, (error, allowedOrigin) => {
    if (error) {
      throw error;
    }
    result = allowedOrigin;
  });

  return result;
}

describe('CORS configuration', () => {
  describe('normalizeOrigin', () => {
    it('normalizes an exact origin', () => {
      expect(normalizeOrigin('https://qsurvey.online')).toBe(
        'https://qsurvey.online',
      );
    });

    it('normalizes trailing slashes and paths down to the origin', () => {
      expect(normalizeOrigin('https://qsurvey.online/admin/path')).toBe(
        'https://qsurvey.online',
      );
      expect(normalizeOrigin('http://localhost:3000/')).toBe(
        'http://localhost:3000',
      );
    });

    it('preserves explicit ports', () => {
      expect(normalizeOrigin('http://localhost:6060')).toBe(
        'http://localhost:6060',
      );
    });

    it('rejects blanks, wildcards, and invalid URLs', () => {
      expect(normalizeOrigin('')).toBeNull();
      expect(normalizeOrigin('   ')).toBeNull();
      expect(normalizeOrigin('*')).toBeNull();
      expect(normalizeOrigin('localhost:3000')).toBeNull();
    });
  });

  describe('parseAllowedOrigins', () => {
    it('parses comma-separated origin values', () => {
      expect(
        parseAllowedOrigins('http://localhost:3000, https://qsurvey.online'),
      ).toEqual(['http://localhost:3000', 'https://qsurvey.online']);
    });

    it('trims, normalizes, deduplicates, and drops invalid values', () => {
      expect(
        parseAllowedOrigins(
          ' https://qsurvey.online/ , *, invalid, https://qsurvey.online/path ',
        ),
      ).toEqual(['https://qsurvey.online']);
    });
  });

  describe('resolveAllowedOrigins', () => {
    it('uses ALLOWED_ORIGINS before FRONTEND_URL', () => {
      expect(
        resolveAllowedOrigins({
          ALLOWED_ORIGINS: 'https://admin.qsurvey.online',
          FRONTEND_URL: 'https://qsurvey.online',
          NODE_ENV: 'production',
        }),
      ).toEqual({
        allowedOrigins: ['https://admin.qsurvey.online'],
        source: 'allowed-origins',
      });
    });

    it('falls back to FRONTEND_URL when ALLOWED_ORIGINS is absent', () => {
      expect(
        resolveAllowedOrigins({
          FRONTEND_URL: 'https://qsurvey.online/login',
          NODE_ENV: 'production',
        }),
      ).toEqual({
        allowedOrigins: ['https://qsurvey.online'],
        source: 'frontend-url',
      });
    });

    it('uses the local development default outside production', () => {
      expect(resolveAllowedOrigins({ NODE_ENV: 'test' })).toEqual({
        allowedOrigins: ['http://localhost:3000'],
        source: 'local-dev-default',
      });
    });

    it('fails closed in production without configured origins', () => {
      expect(resolveAllowedOrigins({ NODE_ENV: 'production' })).toEqual({
        allowedOrigins: [],
        source: 'none',
      });
    });
  });

  describe('buildCorsConfig', () => {
    it('allows requests without an Origin header', () => {
      const corsConfig = buildCorsConfig({ NODE_ENV: 'production' });

      expect(evaluateOrigin(corsConfig.options)).toBe(true);
    });

    it('allows configured origins', () => {
      const corsConfig = buildCorsConfig({
        ALLOWED_ORIGINS: 'http://localhost:3000,https://qsurvey.online',
        NODE_ENV: 'production',
      });

      expect(evaluateOrigin(corsConfig.options, 'https://qsurvey.online')).toBe(
        'https://qsurvey.online',
      );
    });

    it('denies unconfigured browser origins', () => {
      const corsConfig = buildCorsConfig({
        ALLOWED_ORIGINS: 'https://qsurvey.online',
        NODE_ENV: 'production',
      });

      expect(
        evaluateOrigin(corsConfig.options, 'https://malicious.example'),
      ).toBe(false);
    });

    it('does not allow wildcard origins with credentials', () => {
      const corsConfig = buildCorsConfig({
        ALLOWED_ORIGINS: '*',
        NODE_ENV: 'production',
      });

      expect(corsConfig.allowedOrigins).toEqual([]);
      expect(evaluateOrigin(corsConfig.options, 'https://qsurvey.online')).toBe(
        false,
      );
    });
  });
});
