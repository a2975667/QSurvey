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
import { ApprovalQuestion, ApprovalQuestionDocument } from 'src/schemas/questions/approval/approval-question.schema';
import { LikertQuestion, LikertQuestionDocument } from 'src/schemas/questions/likert/likert.question.schema';
import { TextInputQuestion, TextInputQuestionDocument } from 'src/schemas/questions/textInput/text-input.question.schema';
import { TextBlockQuestion, TextBlockQuestionDocument } from 'src/schemas/questions/textBlock/text-block.question.schema';
import { SelectionQuestion, SelectionQuestionDocument } from 'src/schemas/questions/selection/selection-question.schema';
import { debugLog, debugLogLazy } from 'src/config/runtime-flags';

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
    @InjectModel(ApprovalQuestion.name)
    private approvalQuestionModel: Model<ApprovalQuestionDocument>,
    @InjectModel(TextBlockQuestion.name)
    private textBlockQuestionModel: Model<TextBlockQuestionDocument>,
    @InjectModel(SelectionQuestion.name)
    private selectionQuestionModel: Model<SelectionQuestionDocument>,
  ) {}

  // Surveys
  async getAllSurveys() {
    return await this.surveyModel.find({}).exec();
  }

  async getSurveysByManyIds(surveyIdList: Types.ObjectId[]) {
    // Sanitize input: map mixed ids to valid ObjectIds and filter invalids
    const rawList: any[] = Array.isArray(surveyIdList) ? surveyIdList : [];
    const validIds: Types.ObjectId[] = [];
    const invalidSamples: any[] = [];

    rawList.forEach((id) => {
      try {
        const str = typeof id === 'string' ? id : (id && id.toString ? id.toString() : '');
        if (str && Types.ObjectId.isValid(str)) {
          validIds.push(new Types.ObjectId(str));
        } else {
          invalidSamples.push(id);
        }
      } catch (e) {
        invalidSamples.push(id);
      }
    });

    if (invalidSamples.length > 0) {
      debugLog('[CoreService] getSurveysByManyIds: filtered invalid survey IDs', {
        invalidCount: invalidSamples.length,
        sample: invalidSamples.slice(0, 3).map((x) => (x && x.toString ? x.toString() : String(x))),
      });
    }

    if (validIds.length === 0) {
      return [];
    }

    const fetchedSurveys = await this.surveyModel
      .find({ _id: { $in: validIds } })
      .exec();
    return fetchedSurveys;
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
    const rawList: any[] = Array.isArray(questionsIdList) ? questionsIdList : [];
    const normalizedIds: Types.ObjectId[] = [];
    const invalidSamples: any[] = [];

    rawList.forEach((id) => {
      try {
        const value =
          typeof id === 'string'
            ? id
            : id && id.toString
            ? id.toString()
            : '';
        if (value && Types.ObjectId.isValid(value)) {
          normalizedIds.push(new Types.ObjectId(value));
        } else {
          if (value) {
            invalidSamples.push(value);
          }
        }
      } catch (err) {
        invalidSamples.push(id);
      }
    });

    if (invalidSamples.length > 0) {
      debugLog('[DEBUG] getQuestionsByManyIds filtered invalid IDs', {
        count: invalidSamples.length,
        sample: invalidSamples.slice(0, 3),
      });
    }

    if (normalizedIds.length === 0) {
      debugLog('[DEBUG] getQuestionsByManyIds called with empty/invalid list');
      return [];
    }

    debugLog('[DEBUG] getQuestionsByManyIds model collections:', {
      question: this.questionModel?.collection?.name,
      likert: this.likertQuestionModel?.collection?.name,
      text: this.textQuestionModel?.collection?.name,
      qv: this.qvQuestionModel?.collection?.name,
      approval: this.approvalQuestionModel?.collection?.name,
      textBlock: this.textBlockQuestionModel?.collection?.name,
      selection: this.selectionQuestionModel?.collection?.name,
    });

    debugLogLazy(() => [
      '[DEBUG] getQuestionsByManyIds called with IDs:',
      JSON.stringify(normalizedIds.map((id) => id.toHexString())),
    ]);
    
    type QuestionWithId = Question & { _id: Types.ObjectId };

    try {
      // Use Promise.all to query all question models in parallel
      const [
        basicQuestions,
        likertQuestions,
        textQuestions,
        qvQuestions,
        approvalQuestions,
        textBlockQuestions,
        selectionQuestions,
      ] = await Promise.all([
        // Find base questions
        this.questionModel.find({ _id: { $in: normalizedIds } }).exec(),

        // Find Likert questions
        this.likertQuestionModel.find({ _id: { $in: normalizedIds } }).exec(),

        // Find Text questions
        this.textQuestionModel.find({ _id: { $in: normalizedIds } }).exec(),

        // Find QV questions - this was missing!
        this.qvQuestionModel.find({ _id: { $in: normalizedIds } }).exec(),

        // Find Approval questions
        this.approvalQuestionModel.find({ _id: { $in: normalizedIds } }).exec(),

        // Find Text Block questions
        this.textBlockQuestionModel.find({ _id: { $in: normalizedIds } }).exec(),

        // Find Selection questions
        this.selectionQuestionModel.find({ _id: { $in: normalizedIds } }).exec(),
      ]);
      
      // Merge all question types, removing duplicates by ID. Prefer specific models over base.
      const dedupMap = new Map<string, QuestionWithId>();
      const register = (docs: QuestionWithId[]) => {
        docs.forEach((doc) => {
          if (!doc?._id) {
            return;
          }
          const key = doc._id.toString();
          if (!dedupMap.has(key)) {
            dedupMap.set(key, doc);
          }
        });
      };

      register(qvQuestions);
      register(approvalQuestions);
      register(likertQuestions);
      register(textQuestions);
      register(textBlockQuestions);
      register(selectionQuestions);
      register(basicQuestions);

      const allQuestions = Array.from(dedupMap.values());
      
      debugLog(
        '[DEBUG] Found total of',
        allQuestions.length,
        'questions out of',
        normalizedIds.length,
        'IDs',
      );
      debugLog('[DEBUG] Question types breakdown:',
        'Basic:', basicQuestions.length,
        'Likert:', likertQuestions.length,
        'Text:', textQuestions.length,
        'QV:', qvQuestions.length,
        'Approval:', approvalQuestions.length,
        'TextBlock:', textBlockQuestions.length,
        'Selection:', selectionQuestions.length);
      
      // Log which IDs were not found
      const orderedQuestions = normalizedIds
        .map((id) => {
          const key = id.toHexString();
          return dedupMap.get(key);
        })
        .filter((q): q is QuestionWithId => Boolean(q));

      if (orderedQuestions.length < normalizedIds.length) {
        const foundIds = new Set(orderedQuestions.map((q) => q._id.toString()));
        const missingIds = normalizedIds
          .map((id) => id.toHexString())
          .filter((id) => !foundIds.has(id));
        
        debugLogLazy(() => [
          '[DEBUG] Missing question IDs:',
          JSON.stringify(missingIds),
        ]);
      }
      
      return orderedQuestions;
    } catch (error) {
      console.error('[CoreService] getQuestionsByManyIds failed', {
        errorName: error instanceof Error ? error.name : typeof error,
      });
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
    const [
      baseQuestion,
      likertQuestion,
      textQuestion,
      qvQuestion,
      approvalQuestion,
      textBlockQuestion,
      selectionQuestion,
    ] = await Promise.all([
      this.questionModel.findById(questionId).exec(),
      this.likertQuestionModel.findById(questionId).exec(),
      this.textQuestionModel.findById(questionId).exec(),
      this.qvQuestionModel.findById(questionId).exec(),
      this.approvalQuestionModel.findById(questionId).exec(),
      this.textBlockQuestionModel.findById(questionId).exec(),
      this.selectionQuestionModel.findById(questionId).exec(),
    ]);

    // Return the first non-null result
    return (
      selectionQuestion ||
      qvQuestion ||
      approvalQuestion ||
      likertQuestion ||
      textQuestion ||
      textBlockQuestion ||
      baseQuestion
    ) as any;
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
