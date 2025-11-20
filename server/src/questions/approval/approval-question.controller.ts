import { Body, Controller, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { CreateApprovalQuestionDto } from '../dtos/createApprovalQuestion.dto';
import { UpdateApprovalQuestionDto } from '../dtos/updateApprovalQuestion.dto';
import { ApprovalQuestionService } from './approval-question.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class ApprovalQuestionController {
  constructor(private approvalService: ApprovalQuestionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('approval')
  createApprovalQuestion(
    @Request() req,
    @Body() createApprovalQuestionDto: CreateApprovalQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.approvalService.createApprovalQuestion(
      userId,
      createApprovalQuestionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('approval/:id')
  updateApprovalQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateApprovalQuestionDto: UpdateApprovalQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.approvalService.updateApprovalQuestionById(
      userId,
      questionId,
      updateApprovalQuestionDto,
    );
  }
}
