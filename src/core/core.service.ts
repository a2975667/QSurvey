import { BadRequestException, NotImplementedException } from '@nestjs/common';
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
    if (!Types.ObjectId.isValid(surveyId)) {
      throw new BadRequestException('surveyId is invalid');
    }
    const fetchedSurvey = this.surveyModel.findById(surveyId).exec();
    return await fetchedSurvey;
  }

  // Questions
  async getAllQuestions() {
    return await this.questionModel.find({}).exec();
  }

  async getQuestionsByManyIds(questionsIdList: Types.ObjectId[]) {
    // this should check if all ids in the list are ids
    const fetchedQuestions = this.questionModel
      .find({ _id: { $in: questionsIdList } })
      .exec();
    return await fetchedQuestions;
  }

  async getQuestionById(
    questionId: Types.ObjectId,
  ): Promise<Question | undefined> {
    if (!Types.ObjectId.isValid(questionId)) {
      throw new BadRequestException('questionId is invalid');
    }
    const fetchedQuestion = this.questionModel.findById(questionId).exec();
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
  async getSurveyResponseByUKey(uKey: string, surveyId: Types.ObjectId) {
    return await this.surveyResponseModel
      .findOne({ uKey: uKey, surveyId: surveyId })
      .exec();
  }
  async getSurveyResponseByUUID(uuid: string) {
    return await this.surveyResponseModel.findOne({ uuid: uuid }).exec();
  }

  // QuestionResponses
  async getAllQuestionResponses() {
    return undefined;
  }
  async getQuestionResponsesByManyIds(
    questionResponsesIdList: Types.ObjectId[],
  ) {
    const fetchedQuestionResponses = this.questionResponseModel
      .find({ _id: { $in: questionResponsesIdList } })
      .exec();
    return await fetchedQuestionResponses;
  }

  async getQuestionResponseById() {
    return undefined;
  }

  // Users
  async getUsersByManyIds() {
    throw new NotImplementedException('service not implemented.');
  }

  async getUserByEmail(email: string): Promise<UserDocument | undefined> {
    return await this.userModel.findOne({ email: email }).exec();
  }

  async getUserById(userId: Types.ObjectId): Promise<UserDocument | undefined> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is invalid');
    }
    const fetchedUser = await this.userModel.findById(userId).exec();
    return fetchedUser;
  }
}
