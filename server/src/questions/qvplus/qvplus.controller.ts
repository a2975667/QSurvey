import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { CreateUpdateQVPlusQuestionDto } from '../dtos/createQVPlusQuestion.dto';
import { QvPlusService } from './qvplus.service';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('api/v1/protected/questions')
export class QvPlusController {
  constructor(private qvPlusService: QvPlusService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('qvplus')
  createQVPlusQuestion(
    @Request() req,
    @Body() createQVPlusQuestionDto: CreateUpdateQVPlusQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.qvPlusService.createQVPlusQuestion(
      userId,
      createQVPlusQuestionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('qvplus/:id')
  updateQVPlusQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateQVPlusQuestionDto: CreateUpdateQVPlusQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.qvPlusService.updateQVPlusQuestionById(
      userId,
      questionId,
      updateQVPlusQuestionDto,
    );
  }
}
