import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import {
  ApprovalQuestion,
  ApprovalQuestionDocument,
} from 'src/schemas/questions/approval/approval-question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { CreateApprovalQuestionDto } from '../dtos/createApprovalQuestion.dto';
import { UpdateApprovalQuestionDto } from '../dtos/updateApprovalQuestion.dto';

@Injectable()
export class ApprovalQuestionService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(ApprovalQuestion.name)
    private approvalQuestionModel: Model<ApprovalQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  private normalizeOptions(options: any[] = []) {
    const copy = Array.isArray(options)
      ? options.map((option) => ({ ...option }))
      : [];
    return this.coreLogicService.fixQVOptionID(copy);
  }

  private normalizeMaxApprovals(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 1
    ) {
      throw new BadRequestException(
        'maxApprovals must be an integer greater than 0 [AQ004]',
      );
    }
    return value;
  }

  async createApprovalQuestion(
    userId: Types.ObjectId,
    createApprovalQuestionDto: CreateApprovalQuestionDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(
      createApprovalQuestionDto.surveyId,
    );
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const normalizedOptions = this.normalizeOptions(
      createApprovalQuestionDto.options,
    );
    const normalizedMaxApprovals = this.normalizeMaxApprovals(
      createApprovalQuestionDto.maxApprovals,
    );

    const createdApprovalQuestion = new this.approvalQuestionModel({
      ...createApprovalQuestionDto,
      type: 'approval',
      randomizeOptions:
        createApprovalQuestionDto.randomizeOptions !== undefined
          ? createApprovalQuestionDto.randomizeOptions
          : true,
      maxApprovals: normalizedMaxApprovals,
      unlimitedApprovals: createApprovalQuestionDto.unlimitedApprovals === true,
      options: normalizedOptions,
    });

    const savedQuestion = await createdApprovalQuestion.save();

    const currentQuestions = Array.isArray(survey.questions)
      ? survey.questions.map((id: any) =>
          id instanceof Types.ObjectId ? id : new Types.ObjectId(id),
        )
      : [];
    currentQuestions.push(savedQuestion._id);

    await this.surveysService.updateSurveyQuestionsById(
      userId,
      createApprovalQuestionDto.surveyId,
      { questions: currentQuestions } as UpdateSurveyQuestionsDto,
    );

    return savedQuestion;
  }

  async updateApprovalQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateApprovalQuestionDto: UpdateApprovalQuestionDto,
  ) {
    const surveyId = updateApprovalQuestionDto.surveyId;
    if (!surveyId) {
      throw new BadRequestException('surveyId is required [AQ001]');
    }

    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const questionBelongsToSurvey = Array.isArray(survey.questions)
      ? survey.questions.some((id) => id.toString() === questionId.toString())
      : false;

    if (!questionBelongsToSurvey) {
      throw new BadRequestException(
        'Question does not belong to the specified survey [AQ002]',
      );
    }

    const updatePayload: Partial<ApprovalQuestion> = {
      type: 'approval',
    };

    if (updateApprovalQuestionDto.question) {
      updatePayload.question = updateApprovalQuestionDto.question;
    }

    if (updateApprovalQuestionDto.description !== undefined) {
      updatePayload.description = updateApprovalQuestionDto.description;
    }

    if (updateApprovalQuestionDto.randomizeOptions !== undefined) {
      updatePayload.randomizeOptions =
        updateApprovalQuestionDto.randomizeOptions;
    }

    if (updateApprovalQuestionDto.maxApprovals !== undefined) {
      updatePayload.maxApprovals = this.normalizeMaxApprovals(
        updateApprovalQuestionDto.maxApprovals,
      );
    }

    if (updateApprovalQuestionDto.unlimitedApprovals !== undefined) {
      updatePayload.unlimitedApprovals =
        updateApprovalQuestionDto.unlimitedApprovals === true;
    }

    if (
      updateApprovalQuestionDto.options &&
      updateApprovalQuestionDto.options.length
    ) {
      updatePayload.options = this.normalizeOptions(
        updateApprovalQuestionDto.options,
      );
    }

    const updatedQuestion = await this.approvalQuestionModel
      .findByIdAndUpdate(questionId, updatePayload, {
        new: true,
      })
      .exec();

    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [AQ003]');
    }

    return updatedQuestion;
  }
}
