import {
  Controller,
  Get,
  NotImplementedException,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
@ApiBearerAuth()
@ApiTags('Public APIs')
@Controller()
export class SurveysController {
  constructor(private surveyService: SurveysService) {}

  @Get('surveys/:surveyId')
  getSurveys(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Query('sKey') sKey,
    @Query('uKey') uKey,
    @Query('uuid') uuid,
  ) {
    return this.surveyService.serveSurveyToPublicById(
      surveyId,
      sKey,
      uKey,
      uuid,
    );
  }

  @Get('questions/:id')
  getQuestionById() {
    throw new NotImplementedException('API not implemented');
  }
}
