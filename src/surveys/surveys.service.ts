import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Mongoose, Types } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { UpdateSurveyQuestionsDto } from './dtos/updateSurveyQuestions.dto';
import { UpdateUserDto } from 'src/users/dtos/updateUser.dto';
import { UsersService } from 'src/users/users.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  QVQuestion,
  QVQuestionDocument,
  QVQuestionSchema,
} from 'src/schemas/questions/qv/qv-question.schema';
// import { QVQuestionSchema } from 'src/schemas/questions/likert/likert.question.schema';
import {
  Question,
  QuestionDocument,
  QuestionSchema,
} from 'src/schemas/question.schema';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(QVQuestion.name)
    private qvQuestionModel: Model<QVQuestionDocument>,
    private usersService: UsersService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async getAllSurveys(): Promise<Survey[] | undefined> {
    return this.surveyModel.find().exec();
  }

  async findSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
  ): Promise<Survey | undefined> {
    const user = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    
    if (this.coreLogicService.validateSurveyOwnership(user, survey)) {
      // If the survey has questions, populate them with full question data
      if (survey.questions && Array.isArray(survey.questions) && survey.questions.length > 0) {
        console.log('[DEBUG] Survey has question IDs:', JSON.stringify(survey.questions));
        
        // Get the full question documents
        const questionDocs = await this.coreService.getQuestionsByManyIds(survey.questions);
        console.log('[DEBUG] Found question docs:', questionDocs.length);
        
        // Use mergeIdListWithDocList to maintain order and handle missing questions
        const populatedQuestions = this.coreLogicService.mergeIdListWithDocList(
          survey.questions,
          questionDocs,
          [] // Don't remove any fields
        );
        
        // Replace the question IDs with full question objects
        survey.questions = populatedQuestions;
        console.log('[DEBUG] Populated questions:', JSON.stringify(populatedQuestions.map(q => q._id)));
      }
      
      return survey;
    } else {
      throw new InternalServerErrorException(
        'Something went wrong getting survey [SS0050]',
      );
    }
  }

  async servePublicSurveyById(
    surveyId: Types.ObjectId,
    sKey?: string,
    uKey?: string,
    uuid?: string,
  ): Promise<any> {
    try {
      const survey = await this.coreService.getSurveyById(surveyId);
      this.coreLogicService.validateContentAvaliable(survey, 'surveyId');
      
      console.log('[DEBUG] Serving survey with ID:', surveyId.toString());
      console.log('[DEBUG] Survey questions IDs:', JSON.stringify(survey.questions));
      
      const questions = await this.coreService.getQuestionsByManyIds(
        survey.questions,
      );
      
      console.log('[DEBUG] Retrieved', questions.length, 'question documents');
      if (questions.length > 0) {
        questions.forEach((q, idx) => {
          if (q && q._id) {
            console.log(`[DEBUG] Question ${idx}: ID=${q._id.toString()}, Type=${q.type}, QuestionType=${q.setting?.questionType}`);
          } else {
            console.log(`[DEBUG] Question ${idx}: INVALID or MISSING`);
          }
        });
      }
      
      const tempQuestionDocumentList = [];
      
      // Process each question
      questions.forEach((question) => {
        if (!question) {
          console.log('Skipping undefined question');
          return;
        }
        
        if (question.setting && question.setting.questionType === 'qv') {
          try {
            if (question.get('setting.sampleOption')) {
              const sampleCount = question.get('setting.sampleOption');
              const allOptions = question.get('options');
              
              const tmpQuestion = JSON.parse(JSON.stringify(question));
              const sampledOptions = allOptions
                .sort(() => Math.random() - 0.5)
                .slice(0, sampleCount);
              tmpQuestion.options = sampledOptions;

              // cast tmpQuestion to QuestionDocument
              const createQvModel = this.qvQuestionModel;
              const updatedQuestion = new createQvModel(tmpQuestion);

              tempQuestionDocumentList.push(updatedQuestion);
            } else {
              // backward compatibility
              tempQuestionDocumentList.push(question);
            }
          } catch (error) {
            console.error('Error processing QV question:', error);
            tempQuestionDocumentList.push(question);
          }
        } else {
          // Other question types
          tempQuestionDocumentList.push(question);
        }
      });

      // Validate survey permissions
      this.coreLogicService.validateSurveyOpen(survey);
      this.coreLogicService.validateSurveySKey(survey, sKey);
      this.coreLogicService.requireUkey(survey, uKey);

      // Merge questions with their IDs in survey
      const mergedQuestions = this.coreLogicService.mergeIdListWithDocList(
        survey.questions,
        tempQuestionDocumentList,
        ['responses'],
      );
      
      // Add debug log to see what's being returned
      console.log('[DEBUG] Original question IDs count:', survey.questions?.length);
      console.log('[DEBUG] Merged questions count:', mergedQuestions?.length);
      if (mergedQuestions.length > 0) {
        const sample = mergedQuestions[0];
        console.log('[DEBUG] Sample merged question:', {
          id: sample._id?.toString(),
          type: sample.type,
          optionsCount: sample.options?.length || 0
        });
      }
      
      // The native array assignment might not work due to Mongoose schema validation
      // Instead, create a new plain JavaScript object without Mongoose's schema constraints
      const plainSurvey = survey.toObject ? survey.toObject() : JSON.parse(JSON.stringify(survey));
      
      // Now override the questions with the merged question objects
      plainSurvey.questions = mergedQuestions.map(q => {
        return q.toObject ? q.toObject() : JSON.parse(JSON.stringify(q));
      });
      
      // Log details about the plain survey object
      console.log('[DEBUG] Plain survey object created with', plainSurvey.questions.length, 'questions');
      if (plainSurvey.questions.length > 0) {
        const sampleQ = plainSurvey.questions[0];
        console.log('[DEBUG] Sample question keys:', Object.keys(sampleQ).join(', '));
        if (sampleQ.options && Array.isArray(sampleQ.options)) {
          console.log('[DEBUG] Sample question has', sampleQ.options.length, 'options');
        }
      }
      
      // Check if survey.questions is still an array of objects after assignment
      console.log('[DEBUG] After assignment - survey.questions type:', typeof survey.questions);
      console.log('[DEBUG] After assignment - survey.questions is array:', Array.isArray(survey.questions));
      if (Array.isArray(survey.questions) && survey.questions.length > 0) {
        const firstItem = survey.questions[0];
        console.log('[DEBUG] First item type after assignment:', typeof firstItem);
        console.log('[DEBUG] First item is ObjectId:', firstItem instanceof Types.ObjectId);
        console.log('[DEBUG] First item has properties:');
        if (typeof firstItem === 'object' && firstItem !== null) {
          console.log('[DEBUG] Keys:', Object.keys(firstItem).join(', '));
          if ('options' in firstItem) {
            console.log('[DEBUG] Has options property:', Array.isArray(firstItem.options));
            if (Array.isArray(firstItem.options)) {
              console.log('[DEBUG] Options length:', firstItem.options.length);
            }
          }
        }
      }
      
      // Remove sensitive information
      plainSurvey.responses = undefined;
      plainSurvey.collaborators = undefined;

      // Validate UUID if provided
      if (uuid) {
        const surveyResponse = await this.coreService.getSurveyResponseByUUID(
          uuid,
        );
        if (this.coreLogicService.validateUUIDAvaliable(surveyResponse)) {
          if (surveyResponse.surveyId !== surveyId) {
            throw new ForbiddenException(
              'The uuid does not match the requested surveyId. Stop stealing the survey! [SS0089]',
            );
          }
          if (uKey || surveyResponse.uKey) {
            this.coreLogicService.validateSurveyResponseUKey(
              surveyResponse,
              uKey,
            );
          }
          return plainSurvey;
        } else {
          throw new BadRequestException('Something critical failed. [SS0092]');
        }
      }

      // Validate uKey if provided
      if (uKey) {
        const surveyResponse = await this.coreService.getSurveyResponseByUKey(
          uKey,
          surveyId,
        );
        if (this.coreLogicService.validateUKeyAvaliable(surveyResponse)) {
          return plainSurvey;
        } else {
          throw new BadRequestException(
            'The uKey is being consumed. Please provide UUID or use a new uKey. [SS0107]',
          );
        }
      }

      // Final debug log before returning
      console.log('[DEBUG] Final survey object summary:');
      console.log('[DEBUG] Survey ID:', survey._id?.toString());
      console.log('[DEBUG] Survey title:', survey.title);
      console.log('[DEBUG] Questions array exists:', Array.isArray(survey.questions));
      
      if (Array.isArray(survey.questions)) {
        console.log('[DEBUG] Number of questions:', survey.questions.length);
        
        // Check the first question if available
        if (survey.questions.length > 0) {
          try {
            const firstQ = survey.questions[0];
            console.log('[DEBUG] First question summary:');
            
            // Type guard for firstQ to ensure it's an object, not an ObjectId
            if (firstQ && typeof firstQ === 'object' && !Types.ObjectId.isValid(firstQ)) {
              // Safe access to properties
              const qId = firstQ._id ? (
                typeof firstQ._id === 'object' && firstQ._id !== null 
                  ? (typeof firstQ._id.toString === 'function' ? firstQ._id.toString() : String(firstQ._id)) 
                  : String(firstQ._id)
              ) : 'unknown';
                
              console.log('[DEBUG] Question ID:', qId);
              
              // Safe property access with type assertions
              const qType = 'type' in firstQ ? String(firstQ.type) : 'unknown';
              console.log('[DEBUG] Question type:', qType);
              
              // Check for options array with type guard
              if ('options' in firstQ && firstQ.options && Array.isArray(firstQ.options)) {
                console.log('[DEBUG] Question has', firstQ.options.length, 'options');
              } else {
                console.log('[DEBUG] Question has no options array');
              }
            } else {
              console.log('[DEBUG] First question is not a full object, might be an ObjectId');
              if (firstQ && typeof firstQ.toString === 'function') {
                console.log('[DEBUG] ObjectId value:', firstQ.toString());
              }
            }
          } catch (err) {
            console.log('[DEBUG] Error accessing question properties:', err.message);
          }
        }
      }
      
      return plainSurvey;
    } catch (error) {
      console.error('Error in survey service:', error);
      throw error;
    }
  }

  async createNewSurvey(
    userId: Types.ObjectId,
    createSurveyDto: CreateSurveyDto,
  ): Promise<Survey> {
    const createdSurvey = new this.surveyModel(createSurveyDto);
    createdSurvey.collaborators = [...createdSurvey.collaborators, userId];
    const completeCreatedSurvey = await createdSurvey.save();
    let usersurvey = (await this.usersService.findUserById(userId)).surveys;
    usersurvey = [...usersurvey, completeCreatedSurvey._id];
    const updateUserDto = plainToClass(UpdateUserDto, { surveys: usersurvey });
    await this.usersService.updateUserbyId(userId, updateUserDto);
    return completeCreatedSurvey;
  }

  async updateSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    updateSurveyDto: UpdateSurveyDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    if (
      this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId)
    ) {
      return await this.surveyModel
        .findByIdAndUpdate(surveyId, updateSurveyDto, { returnOriginal: false })
        .exec();
    }
  }

  async updateSurveyQuestionsById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    updateSurveyQuestionsDto: UpdateSurveyQuestionsDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    if (
      this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId)
    ) {
      console.log('[DEBUG] updateSurveyQuestionsById - Raw DTO:', JSON.stringify(updateSurveyQuestionsDto));
      console.log('[DEBUG] updateSurveyQuestionsById - Question IDs:', 
        Array.isArray(updateSurveyQuestionsDto.questions) 
          ? updateSurveyQuestionsDto.questions.map(id => id.toString())
          : 'Not an array');
          
      // Convert all IDs to proper MongoDB ObjectIds for storage
      const questionIds = Array.isArray(updateSurveyQuestionsDto.questions) 
        ? updateSurveyQuestionsDto.questions.map(id => {
            if (typeof id === 'string') {
              return new Types.ObjectId(id);
            } else if (id && id.toString && typeof id.toString === 'function') {
              // This ensures we're storing the actual ObjectId reference, not just its string value
              return new Types.ObjectId(id.toString());
            }
            return id;
          })
        : [];
        
      console.log('[DEBUG] updateSurveyQuestionsById - Final ID list for DB update:', 
        questionIds.map(id => id.toString()));
      
      // Update the survey document with the proper ObjectIds
      return await this.surveyModel
        .findByIdAndUpdate(
          surveyId, 
          { $set: { questions: questionIds } }, 
          { new: true } // ensure we get back the updated document
        )
        .exec();
    }
  }

  async removeSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
  ): Promise<Survey | undefined> {
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const collaborators = survey.collaborators;

    await Promise.all(
      collaborators.map(async (uid) => {
        const currUserSurveys = (await this.usersService.findUserById(uid))
          .surveys;
        const updateUserDto = plainToClass(UpdateUserDto, {
          surveys: currUserSurveys.filter((n) => {
            return n != surveyId;
          }),
        });
        await this.usersService.updateUserbyId(userId, updateUserDto);
      }),
    );
    return await this.surveyModel.findByIdAndRemove(surveyId).exec();
  }
}
