import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { LikertQuestion, LikertQuestionDocument } from 'src/schemas/questions/likert/likert.question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { CreateLikertQuestionDto } from '../dtos/createLikertQuestion.dto';
import { UpdateLikertQuestionDto } from '../dtos/updateLikertQuestion.dto';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { debugLog, debugLogLazy } from 'src/config/runtime-flags';

@Injectable()
export class LikertService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(LikertQuestion.name)
    private likertModel: Model<LikertQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createLikertQuestion(
    userId: Types.ObjectId,
    createLikertQuestionDto: CreateLikertQuestionDto,
  ) {
    const user = await this.coreService.getUserById(userId);
    const surveyId = createLikertQuestionDto.surveyId;
    const survey = await this.coreService.getSurveyById(surveyId);
    
    this.coreLogicService.validateSurveyOwnership(user, survey);

    debugLogLazy(() => [
      'Creating Likert question with data:',
      JSON.stringify(createLikertQuestionDto),
    ]);

    // Convert groupId to ObjectId if it's a string
    let groupId = undefined;
    if (createLikertQuestionDto.groupId) {
      try {
        groupId = new Types.ObjectId(createLikertQuestionDto.groupId);
      } catch (e) {
        console.warn('Invalid groupId format');
      }
    }

    // Create the Likert question using the specialized model
    // Let Mongoose handle the _id field automatically
    const createdLikertQuestion = new this.likertModel({
      ...createLikertQuestionDto,
      type: 'likert',
      groupId
    });
    return this.surveysService.saveNewSurveyQuestion(userId, surveyId, createdLikertQuestion);
  }

  async updateLikertQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateLikertQuestionDto: UpdateLikertQuestionDto,
  ) {
    const surveyId = updateLikertQuestionDto.surveyId;
    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');
    
    // Convert groupId to ObjectId if it's a string
    let groupId = undefined;
    if (updateLikertQuestionDto.groupId) {
      try {
        groupId = new Types.ObjectId(updateLikertQuestionDto.groupId);
      } catch (e) {
        console.warn('Invalid groupId format');
      }
    }
    
    // Update the Likert question using the specialized model
    const updatedQuestion = await this.likertModel.findByIdAndUpdate(
      questionId,
      { 
        question: updateLikertQuestionDto.question,
        description: updateLikertQuestionDto.description,
        respondentResultsEnabled: updateLikertQuestionDto.respondentResultsEnabled,
        scale: updateLikertQuestionDto.scale,
        minLabel: updateLikertQuestionDto.minLabel,
        maxLabel: updateLikertQuestionDto.maxLabel,
        type: 'likert',
        groupId
      },
      { new: true, projection: { responses: 0 } },
    );
    
    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [LS0002]');
    }
    
    return updatedQuestion;
  }
}
