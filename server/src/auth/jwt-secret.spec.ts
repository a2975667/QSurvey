import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './jwt-secret';

describe('getJwtSecret', () => {
  const makeConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);

  it('prefers JWT_SECRET when both env vars are present', () => {
    const configService = makeConfigService({
      JWT_SECRET: 'jwt-secret',
      SECRET: 'legacy-secret',
    });

    expect(getJwtSecret(configService)).toBe('jwt-secret');
  });

  it('falls back to SECRET when JWT_SECRET is absent', () => {
    const configService = makeConfigService({
      SECRET: 'legacy-secret',
    });

    expect(getJwtSecret(configService)).toBe('legacy-secret');
  });
});
