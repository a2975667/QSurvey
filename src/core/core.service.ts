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
import { QVQuestion, QVQuestionDocument } from 'src/schemas/questions/qv/qv-question.schema';
import { LikertQuestion, LikertQuestionDocument } from 'src/schemas/questions/likert/likert.question.schema';
import { TextInputQuestion, TextInputQuestionDocument } from 'src/schemas/questions/textInput/text-input.question.schema';

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
    @InjectModel(LikertQuestion.name)
    private likertQuestionModel: Model<LikertQuestionDocument>,
    @InjectModel(TextInputQuestion.name)
    private textQuestionModel: Model<TextInputQuestionDocument>,
    @InjectModel(QVQuestion.name)
    private qvQuestionModel: Model<QVQuestionDocument>,
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
    // Skip if empty list
    if (!questionsIdList || !Array.isArray(questionsIdList) || questionsIdList.length === 0) {
      console.log('[DEBUG] getQuestionsByManyIds called with empty list');
      return [];
    }

    console.log('[DEBUG] getQuestionsByManyIds called with IDs:', JSON.stringify(questionsIdList));
    
    try {
      // Use Promise.all to query all question models in parallel
      const [basicQuestions, likertQuestions, textQuestions, qvQuestions] = await Promise.all([
        // Find base questions
        this.questionModel.find({ _id: { $in: questionsIdList } }).exec(),
        
        // Find Likert questions
        this.likertQuestionModel.find({ _id: { $in: questionsIdList } }).exec(),
        
        // Find Text questions
        this.textQuestionModel.find({ _id: { $in: questionsIdList } }).exec(),
        
        // Find QV questions - this was missing!
        this.qvQuestionModel.find({ _id: { $in: questionsIdList } }).exec()
      ]);
      
      // Merge all question types, removing duplicates by ID
      const allQuestions = [...basicQuestions];
      
      // Add Likert questions that weren't in the basic questions
      likertQuestions.forEach(likertQ => {
        if (!allQuestions.some(q => q._id.toString() === likertQ._id.toString())) {
          allQuestions.push(likertQ);
        }
      });
      
      // Add Text questions that weren't in the combined list
      textQuestions.forEach(textQ => {
        if (!allQuestions.some(q => q._id.toString() === textQ._id.toString())) {
          allQuestions.push(textQ);
        }
      });
      
      // Add QV questions that weren't in the combined list
      qvQuestions.forEach(qvQ => {
        if (!allQuestions.some(q => q._id.toString() === qvQ._id.toString())) {
          allQuestions.push(qvQ);
        }
      });
      
      console.log('[DEBUG] Found total of', allQuestions.length, 'questions out of', questionsIdList.length, 'IDs');
      console.log('[DEBUG] Question types breakdown:',
        'Basic:', basicQuestions.length,
        'Likert:', likertQuestions.length,
        'Text:', textQuestions.length,
        'QV:', qvQuestions.length);
      
      // Log which IDs were not found
      if (allQuestions.length < questionsIdList.length) {
        const foundIds = allQuestions.map(q => q._id.toString());
        const missingIds = questionsIdList
          .map(id => id.toString())
          .filter(id => !foundIds.includes(id));
        
        console.log('[DEBUG] Missing question IDs:', JSON.stringify(missingIds));
      }
      
      return allQuestions;
    } catch (error) {
      console.error('[DEBUG] Error in getQuestionsByManyIds:', error);
      throw error;
    }
  }

  async getQuestionById(
    questionId: Types.ObjectId,
  ): Promise<Question | undefined> {
    if (!Types.ObjectId.isValid(questionId)) {
      throw new BadRequestException('questionId is invalid');
    }
    
    // Try to find the question in each model
    const [baseQuestion, likertQuestion, textQuestion, qvQuestion] = await Promise.all([
      this.questionModel.findById(questionId).exec(),
      this.likertQuestionModel.findById(questionId).exec(),
      this.textQuestionModel.findById(questionId).exec(),
      this.qvQuestionModel.findById(questionId).exec()
    ]);
    
    // Return the first non-null result
    return baseQuestion || likertQuestion || textQuestion || qvQuestion;
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
