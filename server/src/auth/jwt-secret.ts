import { ConfigService } from '@nestjs/config';

export function getJwtSecret(configService: ConfigService): string | undefined {
  return (
    configService.get<string>('JWT_SECRET') ||
    configService.get<string>('SECRET')
  );
}
