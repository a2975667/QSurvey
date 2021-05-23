import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { SurveyController } from './survey.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Survey.name, schema: SurveySchema }]),
  ],
  providers: [SurveysService],
  controllers: [SurveysController, SurveyController],
  exports: [SurveysService],
})
export class SurveysModule {}
