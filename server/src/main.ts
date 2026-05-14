import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { buildCorsConfig } from './config/cors';
import {
  registerDebugRequestLogger,
  registerSpaFallback,
  setupSwaggerIfEnabled,
} from './config/bootstrap-runtime';

declare const module: any; // hot module. To remove for production

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // Create the NestJS application
  const app = await NestFactory.create(AppModule);
  const corsConfig = buildCorsConfig(process.env);
  if (corsConfig.allowedOrigins.length === 0) {
    logger.warn(
      'No browser origins configured for CORS; cross-origin browser requests will be blocked.',
    );
  } else {
    logger.log(
      `CORS allowed origins (${
        corsConfig.source
      }): ${corsConfig.allowedOrigins.join(', ')}`,
    );
  }
  app.enableCors(corsConfig.options);
  app.useGlobalPipes(new ValidationPipe());

  // Get the underlying Express app BEFORE applying any NestJS middleware
  const expressApp = app.getHttpAdapter().getInstance();

  registerDebugRequestLogger(expressApp);
  registerSpaFallback(expressApp);

  // Serve static files after the SPA middleware
  expressApp.use(express.static(join(__dirname, '..', 'build')));

  // We're setting the prefix explicitly on controllers now, so disabling global prefix
  // app.setGlobalPrefix('api/v1');

  setupSwaggerIfEnabled(app, process.env);
  await app.listen(process.env.PORT || 6060);
  // console log port and url
  console.log(
    `Server is running on ${await app.getUrl()}, port: ${
      process.env.PORT || 6060
    }`,
  );
  //await app.listen(6060);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
