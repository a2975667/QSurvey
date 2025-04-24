import { DeleteQuestionsDto } from './dtos/deleteQuestions.dto';
import { QuestionsService } from './questions.service';
import { Controller, Get, Param, Delete } from '@nestjs/common';
import { Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Types } from 'mongoose';
import { CreateQuestionsDto } from './dtos/lookupQuestions.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin) // allow designers to get all questions if they want too
  @Get()
  getAllQuestions(@Request() req) {
    const userId = req.user.userId;
    return this.questionsService.getAllQuestions(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get(':id')
  getQuestionById(
    @Request() req,
    @Body() createQuestionDto: CreateQuestionsDto,
    @Param('id') questionId: Types.ObjectId,
  ) {
    const userId = req.user.userId;
    const surveyId = createQuestionDto.surveyId;
    return this.questionsService.getQuestionById(userId, surveyId, questionId);
  }

  // TODO: check question response status and survey status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete(':id')
  deleteQuestionById(
    @Request() req,
    @Body() deleteQuestionDto: DeleteQuestionsDto,
    @Param('id') questionId: Types.ObjectId,
  ) {
    const userId = req.user.userId;
    return this.questionsService.removeQuestionById(
      userId,
      deleteQuestionDto.surveyId,
      questionId,
    );
  }
}
