import { CoreLogicService } from './core-logic.service';
import { CoreService } from './core.service';
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from 'src/schemas/question.schema';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  QuestionResponse,
  QuestionResponseSchema,
} from 'src/schemas/questionResponse.schema';
import {
  SurveyResponse,
  SurveyResponseSchema,
} from 'src/schemas/surveyResponse.schema';

@Global()
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
  exports: [CoreService, CoreLogicService],
})
export class CoreModule {}
