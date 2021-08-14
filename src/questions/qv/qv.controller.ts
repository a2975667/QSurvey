import { UpdateQVOptionsDto } from '../dtos/updateQVOptions.dto';
import { CreateUpdateQVQuestionDto } from './../dtos/createQVQuestion.dto';
import { Body, Controller } from '@nestjs/common';
import { Request, UseGuards } from '@nestjs/common';
import { Param, Post, Put } from '@nestjs/common';
import { QvService } from './qv.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { UpdateQVSettingsDto } from '../dtos/updateQVSettings.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('protected/questions')
export class QvController {
  constructor(private qvService: QvService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('qv')
  createQVQuestion(
    @Request() req,
    @Body() createQVQuestionDto: CreateUpdateQVQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.qvService.createQVQuestion(userId, createQVQuestionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('qvOptions/:id') //id should also be in body
  updateQVOptions(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateQVOptionsDto: UpdateQVOptionsDto,
  ) {
    const userId = req.user.userId;
    return this.qvService.updateQVOptionsbyId(
      userId,
      questionId,
      updateQVOptionsDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('qvSettings/:id') // id also in body
  updateQVSettings(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateQVSettingsDto: UpdateQVSettingsDto,
  ) {
    const userId = req.user.userId;
    return this.qvService.updateQVSettingsbyId(
      userId,
      questionId,
      updateQVSettingsDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':id') // this should be pushed to body, not id
  updateQVQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateQVQuestionDto: CreateUpdateQVQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.qvService.updateQVQuestionById(
      userId,
      questionId,
      updateQVQuestionDto,
    );
  }
}
