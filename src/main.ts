import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as express from 'express';

declare const module: any; // hot module. To remove for production

async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(AppModule);
  // Enable CORS with more detailed configuration
  app.enableCors({
    origin: true, // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  
  // Get the underlying Express app BEFORE applying any NestJS middleware
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Add a request logging middleware
  expressApp.use((req, res, next) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.url}`);
    next();
  });

  // Add a simple middleware to serve the React app for SPA routes
  // This will run BEFORE NestJS processes the request
  expressApp.use((req, res, next) => {
    // If the URL starts with /api, let NestJS handle it
    if (req.url.startsWith('/api')) {
      console.log(`[DEBUG] API request detected: ${req.method} ${req.url}`);
      return next();
    }
    
    // If the URL is a direct call to /surveys/:id (non-prefixed API route)
    if (req.url.match(/^\/surveys\/[^\/]+$/) && req.method === 'GET') {
      console.log(`[DEBUG] Direct survey API call detected: ${req.method} ${req.url}`);
      return next();
    }
    
    // If the URL has a file extension (like .js, .css, etc.), try to serve it as a static file
    if (req.url.match(/\.\w+$/)) {
      return next();
    }
    
    // For all other URLs (React Router routes), serve index.html
    console.log(`[DEBUG] Serving SPA for: ${req.method} ${req.url}`);
    return res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  });
  
  // Serve static files after the SPA middleware
  expressApp.use(express.static(join(__dirname, '..', 'build')));
  
  // We're setting the prefix explicitly on controllers now, so disabling global prefix
  // app.setGlobalPrefix('api/v1');
  
  // Serve the static assets from the build directory
  const config = new DocumentBuilder()
    .setTitle('Quadratic Survey System Swagger')
    .setDescription('This is the API reference of QV backend system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
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
