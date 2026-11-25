import { BadRequestException } from '@nestjs/common';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CreateUpdateQVQuestionDto } from '../dtos/createQVQuestion.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
// Remove plainToClass - we'll use direct object creation instead
// import { plainToClass } from 'class-transformer';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { QVQuestionDocument } from 'src/schemas/questions/qv/qv-question.schema';
import { SurveysService } from './../../surveys/surveys.service';
import { UpdateQVOptionsDto } from '../dtos/updateQVOptions.dto';
import { UpdateQVSettingsDto } from '../dtos/updateQVSettings.dto';
import { debugLog, debugLogLazy } from 'src/config/runtime-flags';
// Remove DTO import - we'll directly create the update object
// import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';

@Injectable()
export class QvService {
  constructor(
    @InjectModel(QVQuestion.name)
    private QVQuestionModel: Model<QVQuestionDocument>,
    private surveysService: SurveysService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createQVQuestion(
    userId: Types.ObjectId,
    createQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { insertPosition, surveyId, ...createQuestion } = createQVQuestionDto;
    debugLog('[DEBUG][QV] createQVQuestion payload showInstructions:', {
      surveyId: surveyId?.toString?.(),
      showInstructions: createQuestion?.setting?.showInstructions,
    });

    // Process options before saving to ensure optionIds are set properly
    createQuestion.options = this.coreLogicService.fixQVOptionID(
      createQuestion.options,
    );

    // Create question model
    debugLogLazy(() => [
      '[DEBUG] Creating new QV question with data:',
      JSON.stringify(createQuestion),
    ]);
    const createdQVQuestion = new this.QVQuestionModel(createQuestion);
    return this.surveysService.saveNewSurveyQuestion(userId, surveyId, createdQVQuestion, insertPosition);
  }

  //todo: updateQVQuestion cannot update question position, a new API is required.
  async updateQVQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...updateQuestion } = updateQVQuestionDto;
    debugLog('[DEBUG][QV] updateQVQuestionById payload showInstructions:', {
      surveyId: surveyId?.toString?.(),
      questionId: questionId?.toString?.(),
      showInstructions: updateQuestion?.setting?.showInstructions,
    });

    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');
    updateQuestion.options = this.coreLogicService.fixQVOptionID(
      updateQuestion.options,
    );
    const updatedQuestion = await this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { $set: {
        type: updateQuestion.type,
        question: updateQuestion.question,
        description: updateQuestion.description,
        setting: updateQuestion.setting,
        options: updateQuestion.options,
        respondentResultsEnabled: updateQuestion.respondentResultsEnabled,
      } },
      { new: true, projection: { responses: 0 } },
    ).exec();

    if (updatedQuestion) {
      return updatedQuestion;
    } else {
      throw new BadRequestException('Cannot Update Question. [QS0122]');
    }
  }

  async updateQVOptionsbyId(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVOptionsDto: UpdateQVOptionsDto,
  ): Promise<QVQuestion> {
    // check if each option in the options array has a optionId, if not, create a new optionId for it.
    // Todo: optionName should be unique, but it is not enforced in the database.
    updateQVOptionsDto.options = this.coreLogicService.fixQVOptionID(
      updateQVOptionsDto.options,
    );

    const { surveyId, ...QVOptions } = updateQVOptionsDto;
    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { options: QVOptions.options },
      { new: true, projection: { responses: 0 } },
    );
  }

  async updateQVSettingsbyId(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVSettingsDto: UpdateQVSettingsDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...QVSettings } = updateQVSettingsDto;
    debugLog('[DEBUG][QV] updateQVSettingsbyId payload showInstructions:', {
      surveyId: surveyId?.toString?.(),
      questionId: questionId?.toString?.(),
      showInstructions: QVSettings?.setting?.showInstructions,
    });
    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { setting: QVSettings.setting },
      { new: true, projection: { responses: 0 } },
    );
  }
}
