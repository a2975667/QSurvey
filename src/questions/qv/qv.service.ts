import { BadRequestException } from '@nestjs/common';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { CreateUpdateQVQuestionDto } from '../dtos/createQVQuestion.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
// Remove plainToClass - we'll use direct object creation instead
// import { plainToClass } from 'class-transformer';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { QVQuestionDocument } from 'src/schemas/questions/qv/qv-question.schema';
import { SurveysService } from './../../surveys/surveys.service';
import { UpdateQVOptionsDto } from '../dtos/updateQVOptions.dto';
import { UpdateQVSettingsDto } from '../dtos/updateQVSettings.dto';
// Remove DTO import - we'll directly create the update object
// import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';

@Injectable()
export class QvService {
  constructor(
    @InjectModel(QVQuestion.name)
    private QVQuestionModel: Model<QVQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createQVQuestion(
    userId: Types.ObjectId,
    createQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { insertPosition, surveyId, ...createQuestion } = createQVQuestionDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    // Process options before saving to ensure optionIds are set properly
    createQuestion.options = this.coreLogicService.fixQVOptionID(
      createQuestion.options,
    );

    // Create question model
    console.log('[DEBUG] Creating new QV question with data:', JSON.stringify(createQuestion));
    const createdQVQuestion = new this.QVQuestionModel(createQuestion);
    
    // Save the question to database
    const createdQuestion = await createdQVQuestion.save();
    console.log('[DEBUG] Question saved with ID:', createdQuestion._id.toString());
    console.log('[DEBUG] Question document:', JSON.stringify(createdQuestion));
    
    // After saving, we need to update the survey to include this question
    const currQuestionLength = survey.questions ? survey.questions.length : 0;

    let insertIndex = undefined;
    // Determine where to insert the new question
    if (survey.questions === undefined || currQuestionLength === 0) {
      // Initialize questions array if it doesn't exist
      survey.questions = [];
      insertIndex = 0;
    } else if (
      insertPosition === undefined ||
      insertPosition > currQuestionLength
    ) {
      // Insert at the end if position not specified or beyond range
      insertIndex = currQuestionLength;
    } else {
      // Insert at specific position (0-indexed)
      insertIndex = insertPosition - 1;
    }
    
    // Add the new question's ID to the survey's questions array
    console.log('[DEBUG] Before update - Survey questions:', JSON.stringify(survey.questions));
    
    // Here's the key - make sure we're adding the proper ObjectId, not its string representation
    const questionIdToAdd = createdQuestion._id instanceof Types.ObjectId 
        ? createdQuestion._id 
        : new Types.ObjectId(createdQuestion._id.toString());
    
    // TODO: HIGH PRIORITY - Revisit this ID conversion logic after the demo
    // Make a new array with proper ObjectIds
    const updatedQuestions = Array.isArray(survey.questions) 
        ? [...survey.questions.map(id => {
            if (id instanceof Types.ObjectId) {
              return id;
            } else if (typeof id === 'string') {
              return new Types.ObjectId(id);
            } else if (id && typeof id === 'object') {
              // @ts-ignore - Temporarily ignoring TypeScript error for the demo
              return new Types.ObjectId(id.toString());
            } else {
              // Default case for unexpected types
              console.warn('Unexpected ID type in survey.questions:', id);
              return new Types.ObjectId();
            }
          })]
        : [];
        
    // Insert the new question ID at the correct position
    updatedQuestions.splice(insertIndex, 0, questionIdToAdd);
    
    console.log('[DEBUG] After update - Survey questions:', updatedQuestions.map(id => id.toString()));
    console.log('[DEBUG] Inserting question ID', questionIdToAdd.toString(), 'at position', insertIndex);
    
    // Use the properly converted array for the update
    const updateData = {
      questions: updatedQuestions,
    };
    
    console.log('[DEBUG] Raw question IDs for update:', updatedQuestions.map(id => id.toString()));
    console.log('[DEBUG] Number of questions to update:', updatedQuestions.length);
    
    // Update the survey with the new questions array, passing the question IDs directly
    const updatedSurvey = await this.surveysService.updateSurveyQuestionsById(
      userId,
      surveyId,
      { questions: updatedQuestions },
    );
    console.log('[DEBUG] Survey updated. Updated questions array:', JSON.stringify(updatedSurvey.questions));
    
    // Return the created question
    return createdQuestion;
  }

  //todo: updateQVQuestion cannot update question position, a new API is required.
  async updateQVQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVQuestionDto: CreateUpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...updateQuestion } = updateQVQuestionDto;
    if (updateQuestion.insertPosition) delete updateQuestion.insertPosition;

    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);
    updateQuestion.options = this.coreLogicService.fixQVOptionID(
      updateQuestion.options,
    );
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
    questionId: Types.ObjectId,
    updateQVOptionsDto: UpdateQVOptionsDto,
  ): Promise<QVQuestion> {
    // check if each option in the options array has a optionId, if not, create a new optionId for it.
    // Todo: optionName should be unique, but it is not enforced in the database.
    updateQVOptionsDto.options = this.coreLogicService.fixQVOptionID(
      updateQVOptionsDto.options,
    );

    const { surveyId, ...QVOptions } = updateQVOptionsDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { options: QVOptions.options },
      { returnOriginal: false },
    );
  }

  async updateQVSettingsbyId(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVSettingsDto: UpdateQVSettingsDto,
  ): Promise<QVQuestion> {
    const { surveyId, ...QVSettings } = updateQVSettingsDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    return this.QVQuestionModel.findByIdAndUpdate(
      questionId,
      { setting: QVSettings.setting },
      { returnOriginal: false },
    );
  }
}
