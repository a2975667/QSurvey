import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import {
  SelectionQuestion,
  SelectionQuestionDocument,
} from 'src/schemas/questions/selection/selection-question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { CreateSelectionQuestionDto } from '../dtos/createSelectionQuestion.dto';
import { UpdateSelectionQuestionDto } from '../dtos/updateSelectionQuestion.dto';

type SelectionConfig = {
  selectionMode: string;
  displayControl: string;
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  controlRuleThresholds?: { singleToDropdownAt?: number };
};

@Injectable()
export class SelectionQuestionService {
  constructor(
    @InjectModel(SelectionQuestion.name)
    private selectionQuestionModel: Model<SelectionQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  private normalizeOptions(options: any[] = []) {
    const copy = Array.isArray(options)
      ? options.map((option) => ({
          ...option,
          isExclusive: option?.isExclusive === true,
        }))
      : [];
    return this.coreLogicService.fixQVOptionID(copy);
  }

  private normalizeConfig(
    config: SelectionConfig,
    optionCount: number,
  ): SelectionConfig {
    const selectionMode = config.selectionMode === 'multi' ? 'multi' : 'single';
    let displayControl = config.displayControl;

    if (selectionMode === 'multi') {
      displayControl = 'checkbox';
    } else {
      if (displayControl === 'checkbox') {
        displayControl = 'radio';
      }
      if (!['radio', 'dropdown', 'auto'].includes(displayControl)) {
        displayControl = 'radio';
      }
    }

    const required = Boolean(config.required);
    let minSelections = config.minSelections;
    let maxSelections = config.maxSelections;

    if (selectionMode === 'single') {
      minSelections = undefined;
      maxSelections = undefined;
    }

    if (selectionMode === 'multi') {
      if (
        typeof minSelections === 'number' &&
        typeof maxSelections === 'number' &&
        minSelections > maxSelections
      ) {
        throw new BadRequestException(
          'minSelections cannot exceed maxSelections [SQ001]',
        );
      }

      if (typeof minSelections === 'number' && minSelections > optionCount) {
        throw new BadRequestException(
          'minSelections cannot exceed option count [SQ002]',
        );
      }

      if (typeof maxSelections === 'number' && maxSelections > optionCount) {
        throw new BadRequestException(
          'maxSelections cannot exceed option count [SQ003]',
        );
      }
    }

    const controlRuleThresholds = config.controlRuleThresholds;
    if (displayControl === 'auto') {
      const threshold = controlRuleThresholds?.singleToDropdownAt;
      if (typeof threshold !== 'number' || threshold <= 0) {
        throw new BadRequestException(
          'singleToDropdownAt is required when displayControl is auto [SQ004]',
        );
      }
    }

    return {
      selectionMode,
      displayControl,
      required,
      minSelections,
      maxSelections,
      controlRuleThresholds,
    };
  }

  private normalizeGroupId(groupId?: string) {
    if (!groupId) return undefined;
    try {
      return new Types.ObjectId(groupId);
    } catch {
      return undefined;
    }
  }

  async createSelectionQuestion(
    userId: Types.ObjectId,
    createSelectionQuestionDto: CreateSelectionQuestionDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(
      createSelectionQuestionDto.surveyId,
    );
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const normalizedOptions = this.normalizeOptions(
      createSelectionQuestionDto.options,
    );

    const normalizedConfig = this.normalizeConfig(
      {
        selectionMode: createSelectionQuestionDto.selectionMode || 'single',
        displayControl: createSelectionQuestionDto.displayControl || 'radio',
        required: Boolean(createSelectionQuestionDto.required),
        minSelections: createSelectionQuestionDto.minSelections,
        maxSelections: createSelectionQuestionDto.maxSelections,
        controlRuleThresholds: createSelectionQuestionDto.controlRuleThresholds,
      },
      normalizedOptions.length,
    );

    const createdSelectionQuestion = new this.selectionQuestionModel({
      ...createSelectionQuestionDto,
      type: 'selection',
      selectionMode: normalizedConfig.selectionMode,
      displayControl: normalizedConfig.displayControl,
      required: normalizedConfig.required,
      minSelections: normalizedConfig.minSelections,
      maxSelections: normalizedConfig.maxSelections,
      controlRuleThresholds: normalizedConfig.controlRuleThresholds,
      randomizeOptions: Boolean(createSelectionQuestionDto.randomizeOptions),
      options: normalizedOptions,
      groupId: this.normalizeGroupId(createSelectionQuestionDto.groupId),
    });

    const savedQuestion = await createdSelectionQuestion.save();

    const currentQuestions = Array.isArray(survey.questions)
      ? survey.questions.map((id: any) =>
          id instanceof Types.ObjectId ? id : new Types.ObjectId(id),
        )
      : [];
    currentQuestions.push(savedQuestion._id);

    await this.surveysService.updateSurveyQuestionsById(
      userId,
      createSelectionQuestionDto.surveyId,
      { questions: currentQuestions } as UpdateSurveyQuestionsDto,
    );

    return savedQuestion;
  }

  async updateSelectionQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateSelectionQuestionDto: UpdateSelectionQuestionDto,
  ) {
    const surveyId = updateSelectionQuestionDto.surveyId;
    if (!surveyId) {
      throw new BadRequestException('surveyId is required [SQ005]');
    }

    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const questionBelongsToSurvey = Array.isArray(survey.questions)
      ? survey.questions.some(
          (id) => id.toString() === questionId.toString(),
        )
      : false;

    if (!questionBelongsToSurvey) {
      throw new BadRequestException(
        'Question does not belong to the specified survey [SQ006]',
      );
    }

    const existing = await this.selectionQuestionModel
      .findById(questionId)
      .exec();

    if (!existing) {
      throw new BadRequestException('Question not found [SQ007]');
    }

    const normalizedOptions =
      updateSelectionQuestionDto.options &&
      updateSelectionQuestionDto.options.length
        ? this.normalizeOptions(updateSelectionQuestionDto.options)
        : Array.isArray(existing.options)
        ? existing.options
        : [];

    const normalizedConfig = this.normalizeConfig(
      {
        selectionMode:
          updateSelectionQuestionDto.selectionMode ||
          existing.selectionMode ||
          'single',
        displayControl:
          updateSelectionQuestionDto.displayControl ||
          existing.displayControl ||
          'radio',
        required:
          updateSelectionQuestionDto.required !== undefined
            ? Boolean(updateSelectionQuestionDto.required)
            : Boolean(existing.required),
        minSelections:
          updateSelectionQuestionDto.minSelections !== undefined
            ? updateSelectionQuestionDto.minSelections
            : existing.minSelections,
        maxSelections:
          updateSelectionQuestionDto.maxSelections !== undefined
            ? updateSelectionQuestionDto.maxSelections
            : existing.maxSelections,
        controlRuleThresholds:
          updateSelectionQuestionDto.controlRuleThresholds ??
          existing.controlRuleThresholds,
      },
      normalizedOptions.length,
    );

    const updatePayload: Partial<SelectionQuestion> = {
      type: 'selection',
      selectionMode: normalizedConfig.selectionMode,
      displayControl: normalizedConfig.displayControl,
      required: normalizedConfig.required,
      minSelections: normalizedConfig.minSelections,
      maxSelections: normalizedConfig.maxSelections,
      controlRuleThresholds: normalizedConfig.controlRuleThresholds,
      randomizeOptions:
        updateSelectionQuestionDto.randomizeOptions !== undefined
          ? Boolean(updateSelectionQuestionDto.randomizeOptions)
          : Boolean(existing.randomizeOptions),
      options: normalizedOptions,
      groupId:
        updateSelectionQuestionDto.groupId !== undefined
          ? this.normalizeGroupId(updateSelectionQuestionDto.groupId)
          : existing.groupId,
    };

    if (updateSelectionQuestionDto.question) {
      updatePayload.question = updateSelectionQuestionDto.question;
    }

    if (updateSelectionQuestionDto.description !== undefined) {
      updatePayload.description = updateSelectionQuestionDto.description;
    }

    const updatedQuestion = await this.selectionQuestionModel
      .findByIdAndUpdate(questionId, updatePayload, {
        new: true,
      })
      .exec();

    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [SQ008]');
    }

    return updatedQuestion;
  }
}
