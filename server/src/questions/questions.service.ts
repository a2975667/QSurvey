import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from './../schemas/question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { Injectable, NotFoundException } from '@nestjs/common';

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
    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'read');
    const question = await this.coreService.getQuestionById(questionId);
    if (!question) throw new NotFoundException('Question not found in this survey');
    const metadata = (question as QuestionDocument).toObject();
    delete metadata.responses;
    return metadata;
  }

  async removeQuestionById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    questionId: Types.ObjectId,
  ) {
    return this.surveysService.removeSurveyQuestion(userId, surveyId, questionId);
  }
}
