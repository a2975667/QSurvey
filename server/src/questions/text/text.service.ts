import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { TextInputQuestion, TextInputQuestionDocument } from 'src/schemas/questions/textInput/text-input.question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { CreateUpdateTextQuestionDto } from '../dtos/createTextQuestion.dto';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class TextService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(TextInputQuestion.name)
    private textModel: Model<TextInputQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createTextQuestion(
    userId: Types.ObjectId,
    createTextQuestionDto: CreateUpdateTextQuestionDto,
  ) {
    const user = await this.coreService.getUserById(userId);
    const surveyId = createTextQuestionDto.surveyId;
    const survey = await this.coreService.getSurveyById(surveyId);
    
    this.coreLogicService.validateSurveyOwnership(user, survey);

    console.log('Creating Text question with data:', JSON.stringify(createTextQuestionDto));

    // Convert groupId to ObjectId if it's a string
    let groupId = undefined;
    if (createTextQuestionDto.groupId) {
      try {
        groupId = new Types.ObjectId(createTextQuestionDto.groupId);
      } catch (e) {
        console.warn('Invalid groupId format:', createTextQuestionDto.groupId);
      }
    }

    // Create the Text question using the specialized model
    // Let Mongoose handle the _id field automatically
    const createdTextQuestion = new this.textModel({
      ...createTextQuestionDto,
      type: 'text',
      groupId
    });
    
    console.log('[DEBUG] Text question before save:', JSON.stringify({
      _id: createdTextQuestion._id?.toString(),
      question: createdTextQuestion.question,
      multiline: createdTextQuestion.multiline,
      maxLength: createdTextQuestion.maxLength
    }));
    
    try {
      const savedQuestion = await createdTextQuestion.save();
      console.log('[DEBUG] Saved text question successfully with ID:', savedQuestion._id.toString());
      
      // Ensure survey.questions is an array
      const currentQuestions = Array.isArray(survey.questions) ? survey.questions : [];
      console.log('[DEBUG] Current survey questions:', JSON.stringify(currentQuestions.map(q => q.toString())));
      
      // Update survey with new question ID
      const updatedQuestions = [...currentQuestions, savedQuestion._id];
      console.log('[DEBUG] Updated questions array:', JSON.stringify(updatedQuestions.map(q => q.toString())));
      
      const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
        questions: updatedQuestions,
      });
      
      // Update the survey with the new question list
      const updatedSurvey = await this.surveysService.updateSurveyQuestionsById(
        userId,
        surveyId,
        updateSurveyQuestionsDto,
      );
      
      console.log('[DEBUG] Updated survey:', updatedSurvey._id.toString());
      console.log('[DEBUG] Updated survey questions:', JSON.stringify(updatedSurvey.questions.map(q => q.toString())));
      
      return savedQuestion;
    } catch (error) {
      console.error('[ERROR] Failed to save Text question:', error);
      throw error;
    }
  }

  async updateTextQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateTextQuestionDto: CreateUpdateTextQuestionDto,
  ) {
    const user = await this.coreService.getUserById(userId);
    const surveyId = updateTextQuestionDto.surveyId;
    const survey = await this.coreService.getSurveyById(surveyId);
    
    this.coreLogicService.validateSurveyOwnership(user, survey);
    
    // Ensure the question belongs to the survey
    const questionBelongsToSurvey = survey.questions.some(
      q => q.toString() === questionId.toString(),
    );
    
    if (!questionBelongsToSurvey) {
      throw new BadRequestException(
        'Question does not belong to the specified survey [TS0001]',
      );
    }
    
    // Convert groupId to ObjectId if it's a string
    let groupId = undefined;
    if (updateTextQuestionDto.groupId) {
      try {
        groupId = new Types.ObjectId(updateTextQuestionDto.groupId);
      } catch (e) {
        console.warn('Invalid groupId format:', updateTextQuestionDto.groupId);
      }
    }
    
    // Update the Text question using the specialized model
    const updatedQuestion = await this.textModel.findByIdAndUpdate(
      questionId,
      { 
        ...updateTextQuestionDto,
        type: 'text',
        groupId
      },
      { new: true },
    );
    
    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [TS0002]');
    }
    
    return updatedQuestion;
  }
}