import { ResponseModule } from './response/response.module';
import { QuestionsModule } from './questions/questions.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { SurveysModule } from './surveys/surveys.module';
import { CoreModule } from './core/core.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { FrontendController } from './frontend.controller';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    UsersModule,
    ResponseModule,
    SurveysModule,
    QuestionsModule,
    // ConfigModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'   // or '.env.prod' if you renamed it
          : '.env.development',
      // in production you’ll usually set real env vars and skip files:
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'build'), // Serve the static assets from the build directory
      exclude: ['/api/*splat'],
      serveStaticOptions: {
        index: false
      }
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, FrontendController],
  providers: [AppService],
})
export class AppModule {}
