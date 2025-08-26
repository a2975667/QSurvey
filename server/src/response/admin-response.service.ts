import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  QuestionResponse,
  QuestionResponseDocument,
} from 'src/schemas/questionResponse.schema';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from 'src/schemas/surveyResponse.schema';

@Injectable()
export class AdminResponseService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(QuestionResponse.name)
    private questionResponseModel: Model<QuestionResponseDocument>,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async getAllSurveyResponses(userId: Types.ObjectId, params: any) {
    const userInfo = await this.coreService.getUserById(userId);
    this.coreLogicService.validateUserIsAdmin(userInfo);
    const { sort, limit, ...remaining_params } = params;
    // eslint-disable-next-line prefer-const
    let { direction, ...other_params } = remaining_params;
    if (!direction) direction = 1;
    return await this.surveyResponseModel
      .find(other_params)
      .sort({ [sort]: direction })
      .limit(parseInt(limit));
  }

  // TODO: this needs to fix to fit question response, only allow surveyResponseID, questionId
  // what am i writing^
  async getAllQuestionResponses(userId: Types.ObjectId, params: any) {
    const userInfo = await this.coreService.getUserById(userId);
    this.coreLogicService.validateUserIsAdmin(userInfo);
    const { sort, limit, ...remaining_params } = params;
    // eslint-disable-next-line prefer-const
    let { direction, ...other_params } = remaining_params;
    if (!direction) direction = 1;
    return await this.questionResponseModel
      .find(other_params)
      .sort({ [sort]: direction })
      .limit(parseInt(limit));
  }
}
