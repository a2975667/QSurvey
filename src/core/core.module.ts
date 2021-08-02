import { CoreService } from './core.service';
import { CoreLogicService } from './core-logic.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from 'src/schemas/question.schema';
import {
  QuestionResponse,
  QuestionResponseSchema,
} from 'src/schemas/questionResponse.schema';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import {
  SurveyResponse,
  SurveyResponseSchema,
} from 'src/schemas/surveyResponse.schema';
import { User, UserSchema } from 'src/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survey.name, schema: SurveySchema },
      { name: User.name, schema: UserSchema },
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
      { name: QuestionResponse.name, schema: QuestionResponseSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [],
  providers: [CoreService, CoreLogicService],
})
export class CoreModule {}
