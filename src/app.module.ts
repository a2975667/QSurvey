import { QvService } from './questions/qv/qv.service';
import { QvController } from './questions/qv/qv.controller';
import { QuestionsModule } from './questions/questions.module';
import { QuestionsController } from './questions/questions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { SurveysModule } from './surveys/surveys.module';

@Module({
  imports: [
    QuestionsModule,
    ConfigModule.forRoot(),
    UsersModule,
    AuthModule,
    SurveysModule,
    QuestionsModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        useFindAndModify: false,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
