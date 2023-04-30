import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

declare const module: any; // hot module. To remove for production

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api/v1');

  // Serve the static assets from the build directory
  const config = new DocumentBuilder()
    .setTitle('QV System Swagger')
    .setDescription('This is the API reference of QV backend system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT || 6060);
  // console log port and url
  console.log(`Server is running on ${await app.getUrl()}, port: ${process.env.PORT || 6060}`);
  //await app.listen(6060);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();