import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  NotImplementedException,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { AdminResponseService } from './admin-response.service';
import { SurveyResponseQuery } from './dto/surveyResponseQuery.dto';
@ApiBearerAuth()
@ApiTags('Protected APIs: Responses')
@Controller('protected')
export class ProtectedResponseController {
  constructor(private adminResponseService: AdminResponseService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('survey/responses')
  getAllSurveyResponses(@Request() req, @Query() query: SurveyResponseQuery) {
    const userid = req.user.userId;
    return this.adminResponseService.getAllSurveyResponses(userid, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get('survey/responses/Ukey/:ukey')
  getSurveyResponsesByUKey() {
    throw new NotImplementedException();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get('survey/responses/SKey/:skey')
  getSurveyResponsesBySKey() {
    throw new NotImplementedException();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get('survey/responses/:surveyId')
  getSurveyResponsesById() {
    throw new NotImplementedException();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete('survey/responses/:surveyId')
  removeSurveyResponsesById() {
    throw new NotImplementedException();
  }

  // TODO: function not completely implemented
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('questions/responses')
  getAllQuestionResponses(@Request() req, @Query() query: SurveyResponseQuery) {
    const userid = req.user.userId;
    return this.adminResponseService.getAllQuestionResponses(userid, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get('questions/responses/:questionId')
  getQuestionResponsesById() {
    throw new NotImplementedException();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete('questions/responses/:questionId')
  removeQuestionResponsesById() {
    throw new NotImplementedException('not supported by design.');
  }

  @Get('responses')
  getAllResponses() {
    throw new NotImplementedException();
  }
}
