import { Body, Controller, Delete, Post, Put } from '@nestjs/common';
import { CreateQuestionResponseDto } from './dto/createQuestionResponse.dto';
import { UserResponseService } from './user-response.service';

@Controller('user')
export class UserResponseController {
  constructor(private userResponseService: UserResponseService) {}

  @Post('create-response')
  async createResponse(
    @Body() createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (!createQuestionResponseDto.uuid) {
      return this.userResponseService.createSurveyAndQuestionResponse(
        createQuestionResponseDto,
      );
    } else {
      return this.userResponseService.UpdateSurveyAndCreateQuestionResponse(
        createQuestionResponseDto,
      );
    }
  }

  @Put('update-response')
  updateResponse() {
    return 'update response';
  }

  @Delete('delete-response')
  deleteResponse() {
    return 'response removed';
  }

  @Put('complete-survey')
  completeSurvey() {
    'survey completed';
  }

  @Post('remove-survey')
  removeSurvey() {
    'return message';
  }
}
