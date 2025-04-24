import { Body, Controller } from '@nestjs/common';
import { Request, UseGuards } from '@nestjs/common';
import { Param, Post, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CreateUpdateLikertQuestionDto } from '../dtos/createLikertQuestion.dto';
import { LikertService } from './likert.service';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class LikertController {
  constructor(private likertService: LikertService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('likert')
  createLikertQuestion(
    @Request() req,
    @Body() createLikertQuestionDto: CreateUpdateLikertQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.likertService.createLikertQuestion(userId, createLikertQuestionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':id')
  updateLikertQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateLikertQuestionDto: CreateUpdateLikertQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.likertService.updateLikertQuestionById(
      userId,
      questionId,
      updateLikertQuestionDto,
    );
  }
}