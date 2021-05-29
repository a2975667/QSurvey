import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { SurveysService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(private surveyService: SurveysService) {}

  @Get()
  getUserSurveys(): string {
    return 'This action returns all surveys. Intended for internal use only. (getUserSurveys)';
  }

  @Get(':id')
  getSurveyById(@Param('id') id: string) {
    return this.surveyService.findSurveyById(id);
  }

  @Post()
  createSurveyReturnId(@Body() createSurveyDto: CreateSurveyDto) {
    return this.surveyService.createNewSurvey(createSurveyDto);
  }

  @Put(':id')
  updateSurveyById(
    @Param('id') id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
  ) {
    return this.surveyService.updateSurveyById(id, updateSurveyDto);
  }

  @Delete(':id')
  removeSurveyById(@Param('id') id: string) {
    return this.surveyService.removeSurveyById(id);
  }
}
