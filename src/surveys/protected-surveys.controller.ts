import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Param, Put, Request, UseGuards } from '@nestjs/common';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { SurveysService } from './surveys.service';
import { Types } from 'mongoose';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import {
  Controller,
  Get,
  Post,
  Delete,
  NotImplementedException,
} from '@nestjs/common';
@ApiBearerAuth()
@ApiTags('Protected APIs: Surveys')
@Controller('protected/surveys')
export class ProtectedSurveysController {
  constructor(private surveyService: SurveysService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin) // TODO: Fix this default get user's surveys
  @Get()
  getUserSurveys() {
    return this.surveyService.getAllSurveys();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get(':id')
  getSurveyById(@Request() req, @Param('id') surveyId: Types.ObjectId) {
    const userid = req.user.userId;
    return this.surveyService.findSurveyById(userid, surveyId);
  }

  // TODO: Add Guest permission? Create a survey demo without account
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post()
  createSurveyReturnId(
    @Request() req,
    @Body() createSurveyDto: CreateSurveyDto,
  ) {
    const userid = req.user.userId;
    return this.surveyService.createNewSurvey(userid, createSurveyDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':id')
  updateSurveyById(
    @Request() req,
    @Param('id') surveyId: Types.ObjectId,
    @Body() updateSurveyDto: UpdateSurveyDto,
  ) {
    const userid = req.user.userId;
    return this.surveyService.updateSurveyById(
      userid,
      surveyId,
      updateSurveyDto,
    );
  }

  // TODO: check question and survey response. check status before closing
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete(':id')
  removeSurveyById(@Request() req, @Param('id') surveyId: Types.ObjectId) {
    const userid = req.user.userId;
    return this.surveyService.removeSurveyById(userid, surveyId);
  }

  @Put(':surveyId/open')
  openSurveyById() {
    throw new NotImplementedException();
  }

  @Get(':surveyId/close')
  closeSurveyById() {
    throw new NotImplementedException();
  }

  // TODO: Add collaborator

  // TODO: Remove Collaborator
}
