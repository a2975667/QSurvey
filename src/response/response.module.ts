import {
  SurveyResponse,
  SurveyResponseSchema,
} from './../schemas/surveyResponse.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ResponseService } from './response.service';
import { Module } from '@nestjs/common';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import { SurveysModule } from 'src/surveys/surveys.module';
import {
  QuestionResponse,
  QuestionResponseSchema,
} from 'src/schemas/questionResponse.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
      { name: QuestionResponse.name, schema: QuestionResponseSchema },
      { name: Survey.name, schema: SurveySchema },
    ]),
    SurveysModule,
  ],
  controllers: [],
  providers: [ResponseService],
})
export class ResponseModule {}
