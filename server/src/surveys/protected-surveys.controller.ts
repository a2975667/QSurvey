import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Param,
  Put,
  Query,
  Request,
  UseGuards,
  Delete,
  Post,
  Controller,
  Get,
  Res,
  NotImplementedException,
} from '@nestjs/common';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { SurveysService } from './surveys.service';
import { Types } from 'mongoose';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { UpdateSurveyQuestionsDto } from './dtos/updateSurveyQuestions.dto';
import { SurveyResultsQueryDto } from './dtos/surveyResultsQuery.dto';
import { UpdateCollaboratorsDto } from './dtos/updateCollaborators.dto';
import { ModifyCollaboratorDto } from './dtos/modifyCollaborator.dto';
import { SurveyExportQueryDto } from './dtos/surveyExportQuery.dto';
import { Response } from 'express';
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
  @Get(':surveyId/results')
  async getSurveyResults(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Query() query: SurveyResultsQueryDto,
  ) {
    const userid = req.user.userId;
    const roles = req.user.roles;
    console.log('[ProtectedSurveysController] GET /:surveyId/results', {
      userId: userid?.toString(),
      surveyId,
      roles,
      status: query?.status,
      limit: query?.limit,
      asOf: query?.asOf,
      questionId: query?.questionId,
    });
    if (!query?.questionId) {
      return this.surveyService.getSurveyResultsGrouped(userid, roles, surveyId, query);
    }
    return this.surveyService.getSurveyResults(userid, roles, surveyId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @ApiOperation({ summary: 'Export survey responses grouped by respondent (ZIP)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: "Filter by status: Complete, Completed, or All",
  })
  @ApiQuery({
    name: 'asOf',
    required: false,
    description: 'Return responses with derivedAt <= ISO8601 timestamp',
  })
  @ApiResponse({ status: 200, description: 'ZIP archive of respondent JSON files' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  @Get(':surveyId/exports/respondents.zip')
  async exportSurveyRespondents(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Query() query: SurveyExportQueryDto,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.surveyService.streamSurveyRespondentExport(
      userId,
      roles,
      surveyId,
      query,
      res,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @ApiOperation({ summary: 'Export responses for a single question (JSON)' })
  @ApiParam({ name: 'questionId', description: 'Question ID to export' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: "Filter by status: Complete, Completed, or All",
  })
  @ApiQuery({
    name: 'asOf',
    required: false,
    description: 'Return responses with derivedAt <= ISO8601 timestamp',
  })
  @ApiResponse({ status: 200, description: 'Question export JSON' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Survey or question not found' })
  @Get(':surveyId/exports/questions/:questionId.json')
  async exportSurveyQuestion(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Param('questionId') questionId: string,
    @Query() query: SurveyExportQueryDto,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.surveyService.streamSurveyQuestionExport(
      userId,
      roles,
      surveyId,
      questionId,
      query,
      res,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get(':id')
  getSurveyById(@Request() req, @Param('id') surveyId: Types.ObjectId) {
    const userid = req.user.userId;
    return this.surveyService.findSurveyById(userid, surveyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get(':surveyId/collaborators')
  getSurveyCollaborators(@Request() req, @Param('surveyId') surveyId: string) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.surveyService.getCollaborators(userId, roles, surveyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':surveyId/collaborators')
  replaceSurveyCollaborators(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Body() updateDto: UpdateCollaboratorsDto,
  ) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.surveyService.replaceCollaborators(
      userId,
      roles,
      surveyId,
      updateDto.collaboratorIds,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post(':surveyId/collaborators')
  addSurveyCollaborator(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Body() body: ModifyCollaboratorDto,
  ) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.surveyService.addCollaborator(
      userId,
      roles,
      surveyId,
      body.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete(':surveyId/collaborators/:collaboratorId')
  removeSurveyCollaborator(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Param('collaboratorId') collaboratorId: string,
  ) {
    const userId = req.user.userId;
    const roles = req.user.roles;
    return this.surveyService.removeCollaborator(
      userId,
      roles,
      surveyId,
      collaboratorId,
    );
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':surveyId/question-order')
  updateSurveyQuestionOrder(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Body() updateSurveyQuestionsDto: UpdateSurveyQuestionsDto,
  ) {
    const userid = req.user.userId;
    return this.surveyService.updateSurveyQuestionsById(
      userid,
      surveyId,
      updateSurveyQuestionsDto,
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
