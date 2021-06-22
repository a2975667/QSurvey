import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { AdminResponseService } from './admin-response.service';
import { SurveyResponseQuery } from './dto/surveyResponseQuery.dto';

@Controller('admin')
export class AdminResponseController {
  constructor(private adminResponseService: AdminResponseService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('get-all-survey-responses')
  getUserSurveys(@Request() req, @Query() query: SurveyResponseQuery) {
    const userid = req.user.userId;
    return this.adminResponseService.getAllSurveyResponses(userid, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('get-all-question-responses')
  getUserQuestions(@Request() req, @Query() query: SurveyResponseQuery) {
    const userid = req.user.userId;
    return this.adminResponseService.getAllQuestionResponses(userid, query);
  }
}

@Controller('designer')
export class DesignerResponseController {}
