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
@Controller('api/v1')
export class SurveysController {
  constructor(private surveyService: SurveysService) {}

  @Get('surveys/:surveyId')
  async getSurveys(
    @Param('surveyId') surveyId: Types.ObjectId,
    @Query('sKey') sKey,
    @Query('uKey') uKey,
    @Query('uuid') uuid,
  ) {
    console.log('[DEBUG] SurveysController.getSurveys called with ID:', surveyId?.toString());
    console.log('[DEBUG] SurveysController query params:', { sKey, uKey, uuid });
    
    const survey = await this.surveyService.servePublicSurveyById(surveyId, sKey, uKey, uuid);
    
    // Debug survey output before responding
    console.log('[DEBUG] Survey response type:', typeof survey);
    console.log('[DEBUG] Survey questions is array:', Array.isArray(survey.questions));
    if (Array.isArray(survey.questions) && survey.questions.length > 0) {
      console.log('[DEBUG] First question type in response:', typeof survey.questions[0]);
      const firstQ = survey.questions[0];
      
      if (typeof firstQ === 'object' && firstQ !== null) {
        console.log('[DEBUG] First question keys:', Object.keys(firstQ).join(', '));
      }
    }
    
    // Log info about the survey response
    console.log('[DEBUG] After service - questions array type:', Array.isArray(survey.questions));
    
    if (Array.isArray(survey.questions) && survey.questions.length > 0) {
      console.log('[DEBUG] After service - first question type:', typeof survey.questions[0]);
      const firstQ = survey.questions[0];
      if (typeof firstQ === 'object' && firstQ !== null) {
        console.log('[DEBUG] After service - first question keys:', Object.keys(firstQ).join(', '));
        console.log('[DEBUG] After service - first question has options:', 'options' in firstQ);
        if ('options' in firstQ && Array.isArray(firstQ.options)) {
          console.log('[DEBUG] After service - options count:', firstQ.options.length);
        }
      }
    }
    
    return survey;
  }

  @Get('questions/:id')
  getQuestionById() {
    throw new NotImplementedException('API not implemented');
  }
}
