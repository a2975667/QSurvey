import { CompleteSurveyResponseDto } from './dto/completeSurveyResponse.dto';
import { RemoveQuestionResponseDto } from './dto/removeQuestionResponse.dto';
import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { CreateQuestionResponseDto } from './dto/createQuestionResponse.dto';
import { UpdateQuestionResponseDto } from './dto/updateQuestionResponse.dto';
import { UserResponseService } from './user-response.service';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Public APIs')
@Controller('survey/response')
export class UserResponseController {
  constructor(private userResponseService: UserResponseService) {}

  @Get()
  async getPreviousResponse() {
    // need to be careful about security here.
    return 'get incomplete results';
  }

  @Post()
  async createResponse(
    @Body() createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (!createQuestionResponseDto.uuid) {
      return this.userResponseService.createSurveyAndQuestionResponse(
        createQuestionResponseDto,
      );
    } else {
      return this.userResponseService.CreateQuestionAndUpdateSurveyResponse(
        createQuestionResponseDto,
      );
    }
  }

  @Put()
  updateResponse(@Body() updateQuestionResponseDto: UpdateQuestionResponseDto) {
    return this.userResponseService.updateQuestionResponse(
      updateQuestionResponseDto,
    );
  }

  @Delete()
  deleteResponse(@Body() removeQuestionResponseDto: RemoveQuestionResponseDto) {
    return this.userResponseService.removeQuestionResponse(
      removeQuestionResponseDto,
    );
  }

  @Put('complete')
  completeSurvey(@Body() completeSurveyResponseDto: CompleteSurveyResponseDto) {
    return this.userResponseService.markSurveyResponseAsCompleted(
      completeSurveyResponseDto,
    );
  }
}
