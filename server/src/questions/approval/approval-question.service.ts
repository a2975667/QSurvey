import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import {
  ApprovalQuestion,
  ApprovalQuestionDocument,
} from 'src/schemas/questions/approval/approval-question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { CreateApprovalQuestionDto } from '../dtos/createApprovalQuestion.dto';
import { UpdateApprovalQuestionDto } from '../dtos/updateApprovalQuestion.dto';

@Injectable()
export class ApprovalQuestionService {
  constructor(
    @InjectModel(ApprovalQuestion.name)
    private approvalQuestionModel: Model<ApprovalQuestionDocument>,
    private surveysService: SurveysService,
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
    return this.surveysService.saveNewSurveyQuestion(userId, createApprovalQuestionDto.surveyId, createdApprovalQuestion);
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

    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');

    const updatePayload: Partial<ApprovalQuestion> = {
      type: 'approval',
    };
    const unsetPayload: Record<string, ''> = {};

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

    const hasMaxApprovalsField = Object.prototype.hasOwnProperty.call(
      updateApprovalQuestionDto,
      'maxApprovals',
    );
    if (hasMaxApprovalsField) {
      const normalizedMaxApprovals = this.normalizeMaxApprovals(
        (updateApprovalQuestionDto as any).maxApprovals,
      );
      if (typeof normalizedMaxApprovals === 'number') {
        updatePayload.maxApprovals = normalizedMaxApprovals;
      } else {
        unsetPayload.maxApprovals = '';
      }
    }

    if (updateApprovalQuestionDto.unlimitedApprovals !== undefined) {
      updatePayload.unlimitedApprovals =
        updateApprovalQuestionDto.unlimitedApprovals === true;
    }

    if (updateApprovalQuestionDto.respondentResultsEnabled !== undefined) {
      updatePayload.respondentResultsEnabled =
        updateApprovalQuestionDto.respondentResultsEnabled === true;
    }

    if (
      updateApprovalQuestionDto.options &&
      updateApprovalQuestionDto.options.length
    ) {
      updatePayload.options = this.normalizeOptions(
        updateApprovalQuestionDto.options,
      );
    }

    const updateDoc: any = { $set: updatePayload };
    if (Object.keys(unsetPayload).length > 0) {
      updateDoc.$unset = unsetPayload;
    }

    const updatedQuestion = await this.approvalQuestionModel
      .findByIdAndUpdate(questionId, updateDoc, {
        new: true,
        projection: { responses: 0 },
      })
      .exec();

    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [AQ003]');
    }

    return updatedQuestion;
  }
}
