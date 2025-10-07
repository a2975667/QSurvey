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
@Controller('api/v1/protected/surveys')
export class ProtectedSurveysController {
  constructor(private surveyService: SurveysService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get()
  async getUserSurveys(@Request() req) {
    const userid = req.user.userId;
    const roles = req.user.roles;
    console.log('[ProtectedSurveysController] GET / (user projects)', { userId: userid?.toString(), roles });
    const data = await this.surveyService.getSurveysForUser(userid);
    const sampleIds = (data || []).slice(0, 3).map((s: any) => s?._id?.toString?.() ?? String(s?._id));
    console.log('[ProtectedSurveysController] / (user projects) returning', { count: data?.length || 0, sampleIds });
    return data;
  }

  // Admin-only endpoint to list all surveys explicitly
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('all')
  getAllSurveysAdmin() {
    console.log('[ProtectedSurveysController] GET /all (admin)');
    return this.surveyService.getAllSurveysAdmin();
  }

  // Simplified model: collaborators govern access; no owner migration needed

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
    console.log('[ProtectedSurveysController] POST / (create survey)', { userId: userid?.toString(), title: createSurveyDto?.title });
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
