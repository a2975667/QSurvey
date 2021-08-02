import { UpdateQVOptionsDto } from '../dtos/updateQVOptions.dto';
import { SurveysService } from './../../surveys/surveys.service';
import { Injectable } from '@nestjs/common';
import { BadRequestException, MethodNotAllowedException } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QVQuestionDocument } from 'src/schemas/questions/qv/qv-question.schema';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { CreateUpdateQVQuestionDto } from '../dtos/createQVQuestion.dto';
import { Role } from 'src/auth/roles/role.enum';
import { UsersService } from 'src/users/users.service';
import { plainToClass } from 'class-transformer';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { UpdateQVSettingsDto } from '../dtos/updateQVSettings.dto';

@Injectable()
export class QvService {
  constructor(
    @InjectModel(QVQuestion.name)
    private QVQuestionModel: Model<QVQuestionDocument>,
    private usersService: UsersService,
    private surveysService: SurveysService,
  ) {}

  async createQVQuestion(
    userId: Types.ObjectId,
    createQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { insertPosition, surveyId, ...createQuestion } = createQVQuestionDto;
    const userInfo = await this.usersService.findUserById(userId);
    const surveyInfo = await this.surveysService.findSurveyById(
      userId,
      surveyId,
    );
    if (!surveyInfo) {
      throw new MethodNotAllowedException();
    }
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId)
    ) {
      throw new UnauthorizedException();
    }

    const createdQVQuestion = new this.QVQuestionModel(createQuestion);
    const createdQuestion = await createdQVQuestion.save();
    const currQuestionLength = surveyInfo.questions.length;

    let insertIndex = undefined;
    if (surveyInfo.questions === undefined || currQuestionLength === 0) {
      insertIndex = 0;
    } else if (
      insertPosition === undefined ||
      insertPosition > currQuestionLength
    ) {
      insertIndex = currQuestionLength;
    } else {
      insertIndex = insertPosition - 1;
    }
    surveyInfo.questions.splice(insertIndex, 0, createdQuestion._id);
    const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
      questions: surveyInfo.questions,
    });
    await this.surveysService.updateSurveyQuestionsById(
      userId,
      surveyId,
      updateSurveyQuestionsDto,
    );
    return createdQuestion;
  }

  // remind that updateQVQuestion cannot update question position, a new API is required.
  async updateQVQuestionById(
    userId: Types.ObjectId,
    questionId: string,
    updateQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...updateQuestion } = updateQVQuestionDto;
    if (updateQuestion.insertPosition) delete updateQuestion.insertPosition;
    const userInfo = await this.usersService.findUserById(userId);
    const surveyInfo = await this.surveysService.findSurveyById(
      userId,
      surveyId,
    );
    if (!surveyInfo) {
      throw new MethodNotAllowedException();
    }
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId)
    ) {
      throw new UnauthorizedException();
    }
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
    const userInfo = await this.usersService.findUserById(userId);
    const surveyInfo = await this.surveysService.findSurveyById(
      userId,
      surveyId,
    );
    if (!surveyInfo) throw new MethodNotAllowedException();
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId)
    ) {
      throw new UnauthorizedException();
    }

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
    const userInfo = await this.usersService.findUserById(userId);
    const surveyInfo = await this.surveysService.findSurveyById(
      userId,
      surveyId,
    );
    if (!surveyInfo) throw new MethodNotAllowedException();
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId)
    ) {
      throw new UnauthorizedException();
    }

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { setting: QVSettings.setting },
      { returnOriginal: false },
    );
  }
}
