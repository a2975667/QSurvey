import { QuestionsModule } from './../questions/questions.module';
import {
  SurveyResponse,
  SurveyResponseSchema,
} from './../schemas/surveyResponse.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import { SurveysModule } from 'src/surveys/surveys.module';
import {
  QuestionResponse,
  QuestionResponseSchema,
} from 'src/schemas/questionResponse.schema';
import { ProtectedResponseController } from './protected-response.controller';
import { UserResponseController } from './user-response.controller';
import { AdminResponseService } from './admin-response.service';
import { UserResponseService } from './user-response.service';
import { SurveysService } from 'src/surveys/surveys.service';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Question, QuestionSchema } from 'src/schemas/question.schema';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
      { name: QuestionResponse.name, schema: QuestionResponseSchema },
      { name: Survey.name, schema: SurveySchema },
      { name: User.name, schema: UserSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
    SurveysModule,
    QuestionsModule,
    ConfigModule,
    JwtModule,
    AuthModule,
  ],
  controllers: [ProtectedResponseController, UserResponseController],
  providers: [AdminResponseService, UserResponseService, UsersService],
})
export class ResponseModule {}
