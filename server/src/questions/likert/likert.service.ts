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
    
    debugLogLazy(() => [
      '[DEBUG] Likert question before save:',
      JSON.stringify({
        _id: createdLikertQuestion._id?.toString(),
        question: createdLikertQuestion.question,
        scale: createdLikertQuestion.scale,
        minLabel: createdLikertQuestion.minLabel,
        maxLabel: createdLikertQuestion.maxLabel,
      }),
    ]);
    
    try {
      const savedQuestion = await createdLikertQuestion.save();
      debugLog('[DEBUG] Saved likert question successfully with ID:', savedQuestion._id.toString());
      
      // Ensure survey.questions is an array
      const currentQuestions = Array.isArray(survey.questions) ? survey.questions : [];
      const currentQuestionIds = currentQuestions.map((q: any) =>
        q && typeof q.toString === 'function' ? q.toString() : String(q),
      );
      debugLogLazy(() => [
        '[DEBUG] Current survey questions:',
        JSON.stringify(currentQuestionIds),
      ]);
      
      // Update survey with new question ID
      const updatedQuestionIds = [
        ...currentQuestionIds.map((id) => new Types.ObjectId(id)),
        savedQuestion._id as Types.ObjectId,
      ];
      const updatedQuestionStrings = updatedQuestionIds.map((q) => q.toString());
      debugLogLazy(() => [
        '[DEBUG] Updated questions array:',
        JSON.stringify(updatedQuestionStrings),
      ]);

      // Sanity check before updating survey: ensure we pass the saved ID through
      if (!updatedQuestionStrings.includes(savedQuestion._id.toString())) {
        console.warn(
          '[WARN][LikertService] Mismatch between saved question ID and payload',
          { payloadCount: updatedQuestionStrings.length },
        );
      }

      // Update the survey with the new question list (no DTO re-generation that could mutate IDs)
      const updatedSurvey = await this.surveysService.updateSurveyQuestionsById(
        userId,
        surveyId,
        { questions: updatedQuestionIds } as any,
      );
      
      debugLog('[DEBUG] Updated survey:', updatedSurvey._id.toString());
      debugLogLazy(() => [
        '[DEBUG] Updated survey questions:',
        JSON.stringify(updatedSurvey.questions.map(q => q.toString())),
      ]);
      
      return savedQuestion;
    } catch (error) {
      console.error('[LikertService] Failed to save Likert question', {
        errorName: error instanceof Error ? error.name : typeof error,
      });
      throw error;
    }
  }

  async updateLikertQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateLikertQuestionDto: UpdateLikertQuestionDto,
  ) {
    const user = await this.coreService.getUserById(userId);
    const surveyId = updateLikertQuestionDto.surveyId;
    const survey = await this.coreService.getSurveyById(surveyId);
    
    this.coreLogicService.validateSurveyOwnership(user, survey);
    
    // Ensure the question belongs to the survey
    const questionBelongsToSurvey = survey.questions.some(
      q => q.toString() === questionId.toString(),
    );
    
    if (!questionBelongsToSurvey) {
      throw new BadRequestException(
        'Question does not belong to the specified survey [LS0001]',
      );
    }
    
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
        ...updateLikertQuestionDto,
        type: 'likert',
        groupId
      },
      { new: true },
    );
    
    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [LS0002]');
    }
    
    return updatedQuestion;
  }
}
