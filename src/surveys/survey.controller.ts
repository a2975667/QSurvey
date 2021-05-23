import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { SurveysService } from './surveys.service';

@Controller('survey')
export class SurveyController {
  constructor(private surveyService: SurveysService) {}

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
