import { BadRequestException } from '@nestjs/common';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { CreateUpdateQVQuestionDto } from '../dtos/createQVQuestion.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { QVQuestionDocument } from 'src/schemas/questions/qv/qv-question.schema';
import { SurveysService } from './../../surveys/surveys.service';
import { UpdateQVOptionsDto } from '../dtos/updateQVOptions.dto';
import { UpdateQVSettingsDto } from '../dtos/updateQVSettings.dto';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';

@Injectable()
export class QvService {
  constructor(
    @InjectModel(QVQuestion.name)
    private QVQuestionModel: Model<QVQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createQVQuestion(
    userId: Types.ObjectId,
    createQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { insertPosition, surveyId, ...createQuestion } = createQVQuestionDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const createdQVQuestion = new this.QVQuestionModel(createQuestion);
    const createdQuestion = await createdQVQuestion.save();
    const currQuestionLength = survey.questions.length;

    let insertIndex = undefined;
    if (survey.questions === undefined || currQuestionLength === 0) {
      insertIndex = 0;
    } else if (
      insertPosition === undefined ||
      insertPosition > currQuestionLength
    ) {
      insertIndex = currQuestionLength;
    } else {
      insertIndex = insertPosition - 1;
    }
    survey.questions.splice(insertIndex, 0, createdQuestion._id);
    const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
      questions: survey.questions,
    });
    await this.surveysService.updateSurveyQuestionsById(
      userId,
      surveyId,
      updateSurveyQuestionsDto,
    );
    return createdQuestion;
  }

  //todo: updateQVQuestion cannot update question position, a new API is required.
  async updateQVQuestionById(
    userId: Types.ObjectId,
    questionId: string,
    updateQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...updateQuestion } = updateQVQuestionDto;
    if (updateQuestion.insertPosition) delete updateQuestion.insertPosition;

    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);
    const updatedQuestion = await this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      updateQuestion,
      { returnOriginal: false },
    ).exec();

    if (updateQuestion) {
      return updatedQuestion;
    } else {
      throw new BadRequestException('Cannot Update Question. [QS0122]');
    }
  }

  async updateQVOptionsbyId(
    userId: Types.ObjectId,
    questionId: string,
    updateQVOptionsDto: UpdateQVOptionsDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...QVOptions } = updateQVOptionsDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { options: QVOptions.options },
      { returnOriginal: false },
    );
  }

  async updateQVSettingsbyId(
    userId: Types.ObjectId,
    questionId: string,
    updateQVSettingsDto: UpdateQVSettingsDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...QVSettings } = updateQVSettingsDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { setting: QVSettings.setting },
      { returnOriginal: false },
    );
  }
}
