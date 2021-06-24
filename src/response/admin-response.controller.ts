import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  NotImplementedException,
  Delete,
} from '@nestjs/common';
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

  // TODO: function not completely implemented
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('get-all-question-responses')
  getUserQuestions(@Request() req, @Query() query: SurveyResponseQuery) {
    const userid = req.user.userId;
    return this.adminResponseService.getAllQuestionResponses(userid, query);
  }

  @Get('get-all-responses')
  getAllResponses() {
    throw new NotImplementedException();
  }
}

@Controller('designer')
export class DesignerResponseController {
  @Get('get-survey-responses/:surveyId')
  getSurveyResponsesById() {
    throw new NotImplementedException();
  }

  @Get('get-question-responses/:questionId')
  getQuestionResponsesById() {
    throw new NotImplementedException();
  }

  @Get('get-full-responses/:surveyId')
  getFullResponsesById() {
    throw new NotImplementedException();
  }

  @Get('get-unique-responses/:key')
  getUniqueResponsesByKey() {
    throw new NotImplementedException();
  }

  @Get('get-skey-responses/:skey')
  getResponsesBySKey() {
    throw new NotImplementedException();
  }

  @Delete('remove-survey-response/:surveyResponseId')
  removeSurveyResponseById() {
    throw new NotImplementedException();
  }

  @Get('remove-question-response/')
  removeQuestionResponseById() {
    throw new NotImplementedException('not supported by design.');
  }
}
