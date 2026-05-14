import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { debugLog, isSwaggerEnabled } from './runtime-flags';

type Middleware = (req: any, res: any, next: () => void) => void;
type ExpressLike = {
  use: (middleware: Middleware) => void;
};

export function registerDebugRequestLogger(expressApp: ExpressLike): void {
  expressApp.use((req, res, next) => {
    debugLog(`[DEBUG] Incoming request: ${req.method} ${req.url}`);
    next();
  });
}

export function getSpaIndexPath(): string {
  return join(process.cwd(), 'build', 'index.html');
}

export function registerSpaFallback(expressApp: ExpressLike): void {
  expressApp.use((req, res, next) => {
    // If the URL starts with /api, let NestJS handle it
    if (req.url.startsWith('/api')) {
      debugLog(`[DEBUG] API request detected: ${req.method} ${req.url}`);
      return next();
    }

    // If the URL is a direct call to /surveys/:id (non-prefixed API route)
    if (req.url.match(/^\/surveys\/[^\/]+$/) && req.method === 'GET') {
      debugLog(
        `[DEBUG] Direct survey API call detected: ${req.method} ${req.url}`,
      );
      return next();
    }

    // If the URL has a file extension (like .js, .css, etc.), try to serve it as a static file
    if (req.url.match(/\.\w+$/)) {
      return next();
    }

    // For all other URLs (React Router routes), serve index.html
    debugLog(`[DEBUG] Serving SPA for: ${req.method} ${req.url}`);
    return res.sendFile(getSpaIndexPath());
  });
}

export function setupSwaggerIfEnabled(
  app: any,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isSwaggerEnabled(env)) {
    return false;
  }

  const config = new DocumentBuilder()
    .setTitle('Quadratic Survey System Swagger')
    .setDescription('This is the API reference of QV backend system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  return true;
}
