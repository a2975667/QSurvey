import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import {
  Controller,
  Get,
  Header,
  NotImplementedException,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { Types } from 'mongoose';
@ApiBearerAuth()
@ApiTags('Public APIs')
@Controller()
export class SurveysController {
  constructor(private surveyService: SurveysService) {}

  @Get('surveys/:surveyId')
  getSurveys(
    @Param('surveyId') surveyId: Types.ObjectId,
    @Query('sKey') sKey,
    @Query('uKey') uKey,
    @Query('uuid') uuid,
  ) {
    return this.surveyService.servePublicSurveyById(surveyId, sKey, uKey, uuid);
  }

  @Get('questions/:id')
  getQuestionById() {
    throw new NotImplementedException('API not implemented');
  }
}
