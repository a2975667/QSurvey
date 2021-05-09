import { Controller, Get } from '@nestjs/common';

@Controller('surveys')
export class SurveysController {
  @Get()
  getUserSurveys(): string {
    return 'This action returns all surveys. Intended for internal use only.';
  }

  @Get()
  getAllSurveys(): string {
    return 'This action returns all surveys. Intended for internal use only.';
  }

  // @Get(:id)
  // getOneSurveyById(): string {
  //   return 'This action returns all surveys. Intended for internal use only.';
  // }

  // @Get()
  // getUserSurveys(): string {
  //   return 'This action returns all surveys. Intended for internal use only.';
  // }
}
