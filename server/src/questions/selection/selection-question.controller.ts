import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateSelectionQuestionDto } from '../dtos/createSelectionQuestion.dto';
import { UpdateSelectionQuestionDto } from '../dtos/updateSelectionQuestion.dto';
import { SelectionQuestionService } from './selection-question.service';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class SelectionQuestionController {
  constructor(private selectionService: SelectionQuestionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('selection')
  createSelectionQuestion(
    @Request() req,
    @Body() createSelectionQuestionDto: CreateSelectionQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.selectionService.createSelectionQuestion(
      userId,
      createSelectionQuestionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('selection/:id')
  updateSelectionQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateSelectionQuestionDto: UpdateSelectionQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.selectionService.updateSelectionQuestionById(
      userId,
      questionId,
      updateSelectionQuestionDto,
    );
  }
}
