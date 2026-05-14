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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { CreateTextBlockQuestionDto } from '../dtos/createTextBlockQuestion.dto';
import { UpdateTextBlockQuestionDto } from '../dtos/updateTextBlockQuestion.dto';
import { TextBlockService } from './text-block.service';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class TextBlockController {
  constructor(private textBlockService: TextBlockService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('text-block')
  createTextBlockQuestion(
    @Request() req,
    @Body() createTextBlockQuestionDto: CreateTextBlockQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.textBlockService.createTextBlockQuestion(
      userId,
      createTextBlockQuestionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('text-block/:id')
  updateTextBlockQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateTextBlockQuestionDto: UpdateTextBlockQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.textBlockService.updateTextBlockQuestionById(
      userId,
      questionId,
      updateTextBlockQuestionDto,
    );
  }
}
