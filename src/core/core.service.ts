import { BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { Survey, SurveyDocument } from 'src/schemas/survey.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  QuestionResponse,
  QuestionResponseDocument,
} from 'src/schemas/questionResponse.schema';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from 'src/schemas/surveyResponse.schema';

@Injectable()
export class CoreService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(QuestionResponse.name)
    private questionResponseModel: Model<QuestionResponseDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // Surveys
  async getAllSurveys() {
    return await this.userModel.find({}).exec();
  }

  async getSurveysByManyIds(surveyIdList: Types.ObjectId[]) {
    const fetchedSurveys = this.surveyModel
      .find({ _id: { $in: surveyIdList } })
      .exec();
    return await fetchedSurveys;
  }

  async getSurveyById(surveyId: Types.ObjectId) {
    const fetchedSurvey = this.surveyModel.findById(surveyId).exec();
    return await fetchedSurvey;
  }

  // Questions
  async getAllQuestions() {
    return await this.questionModel.find({}).exec();
  }

  async getQuestionsByManyIds(questionsIdList: Types.ObjectId[]) {
    const fetchedQuestions = this.questionModel
      .find({ _id: { $in: questionsIdList } })
      .exec();
    return await fetchedQuestions;
  }

  async getQuestionById(questionId: Types.ObjectId) {
    const fetchedQuestion = this.surveyModel.findById(questionId).exec();
    return await fetchedQuestion;
  }

  // SurveyResponses
  async getAllSurveyResponses() {
    return undefined;
  }
  async getSurveyResponsesByManyIds() {
    return undefined;
  }
  async getSurveyResponseById() {
    return undefined;
  }

  // QuestionResponses
  async getAllQuestionResponses() {
    return undefined;
  }
  async getQuestionResponsesByManyIds() {
    return undefined;
  }
  async getQuestionResponseById() {
    return undefined;
  }

  // Users
  async getUsersByManyIds() {
    return undefined;
  }
  async getUserById(userId: Types.ObjectId): Promise<User | undefined> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is invalid');
    }
    const fetchedUser = await this.userModel.findById(userId).exec();
    return fetchedUser;
  }
}
