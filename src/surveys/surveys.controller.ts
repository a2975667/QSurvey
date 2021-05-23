import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';

@Controller('surveys')
export class SurveysController {
  @Get()
  getUserSurveys(): string {
    return 'This action returns all surveys. Intended for internal use only. (getUserSurveys)';
  }
}
