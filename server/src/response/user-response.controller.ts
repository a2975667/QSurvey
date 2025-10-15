import { CompleteSurveyResponseDto } from './dto/completeSurveyResponse.dto';
import { RemoveQuestionResponseDto } from './dto/removeQuestionResponse.dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CreateQuestionResponseDto } from './dto/createQuestionResponse.dto';
import { UpdateQuestionResponseDto } from './dto/updateQuestionResponse.dto';
import { UserResponseService } from './user-response.service';
import { ApiTags } from '@nestjs/swagger';
import { GetUserSurveyResponseDTO } from './dto/getUserSurveyFullResponse.dto';
import {
  GetCompletedSurveyResponseQueryDto,
  GetSurveyResponseUuidParamDto,
  GetCompletedSurveyResultsQueryDto,
} from './dto/getCompletedSurveyResponse.dto';
@ApiTags('Public APIs')
@Controller('api/v1/survey/responses')
export class UserResponseController {
  constructor(private userResponseService: UserResponseService) {}

  @Get()
  async getPreviousResponse(
    @Query() getUserSurveyResponseDTO: GetUserSurveyResponseDTO,
  ) {
    // this API is to serve incomplete survey information.
    // the UUID can be stored as a cookie value to prevent tab switching
    // and accident tab/window closure.
    return this.userResponseService.getIncompleteSurveyResponseByUUID(
      getUserSurveyResponseDTO,
    );
  }

  @Get(':uuid')
  async getCompletedSurveyResponse(
    @Param() params: GetSurveyResponseUuidParamDto,
    @Query() query: GetCompletedSurveyResponseQueryDto,
  ) {
    return this.userResponseService.getCompletedSurveyResponseSnapshot({
      uuid: params.uuid,
      surveyId: query.surveyId,
      sKey: query.sKey,
      uKey: query.uKey,
    });
  }

  @Get(':uuid/results')
  async getCompletedSurveyAggregates(
    @Param() params: GetSurveyResponseUuidParamDto,
    @Query() query: GetCompletedSurveyResultsQueryDto,
  ) {
    return this.userResponseService.getCompletedSurveyAggregates({
      uuid: params.uuid,
      surveyId: query.surveyId,
      questionId: query.questionId,
      sKey: query.sKey,
      uKey: query.uKey,
      limit: query.limit,
      cursor: query.cursor,
    });
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
