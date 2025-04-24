import { Body, Controller } from '@nestjs/common';
import { Request, UseGuards } from '@nestjs/common';
import { Param, Post, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CreateUpdateTextQuestionDto } from '../dtos/createTextQuestion.dto';
import { TextService } from './text.service';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class TextController {
  constructor(private textService: TextService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('text')
  createTextQuestion(
    @Request() req,
    @Body() createTextQuestionDto: CreateUpdateTextQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.textService.createTextQuestion(userId, createTextQuestionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':id')
  updateTextQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateTextQuestionDto: CreateUpdateTextQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.textService.updateTextQuestionById(
      userId,
      questionId,
      updateTextQuestionDto,
    );
  }
}