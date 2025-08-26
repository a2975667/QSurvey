import { plainToClass } from 'class-transformer';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from './../schemas/question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async getAllQuestions(
    userId: Types.ObjectId,
  ): Promise<Question[] | undefined> {
    const userInfo = await this.coreService.getUserById(userId);
    this.coreLogicService.validateUserIsAdmin(userInfo);
    return await this.questionModel.find().exec();
  }

  async getQuestionById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    questionId: Types.ObjectId,
  ): Promise<Question | undefined> {
    const userInfo = await this.coreService.getUserById(userId);
    this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId);
    return await this.coreService.getQuestionById(questionId);
  }

  async removeQuestionById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    questionId: Types.ObjectId,
  ) {
    const user = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(user, survey);

    let surveyQuestions = survey.questions;

    surveyQuestions = surveyQuestions.filter((n) => {
      return n != questionId;
    });
    const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
      questions: surveyQuestions,
    });
    await this.surveysService.updateSurveyQuestionsById(
      userId,
      surveyId,
      updateSurveyQuestionsDto,
    );
    // Todo: need to remove question from survey
    // Todo: need to warn user if there are responses for question
    const deletedQuestion = await this.questionModel
      .findByIdAndRemove(questionId)
      .exec();
    if (deletedQuestion) {
      return await this.coreService.getSurveyById(surveyId);
    } else {
      throw new BadRequestException('Cannot Find QuestionId. [QS0072]');
    }
  }
}
