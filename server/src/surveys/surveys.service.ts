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
import { Role } from 'src/auth/roles/role.enum';
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
    console.log('[SurveysService] getAllSurveys() called');
    return this.surveyModel.find().exec();
  }

  async getSurveysForUser(userId: Types.ObjectId): Promise<Survey[] | undefined> {
    const isObjId = (userId as any)?._bsontype === 'ObjectID' || userId instanceof Types.ObjectId;
    console.log('[SurveysService] getSurveysForUser called', { userId: userId?.toString(), userIdType: isObjId ? 'ObjectId' : typeof (userId as any) });
    const user = await this.coreService.getUserById(userId);
    if (!user) {
      console.log('[SurveysService] getSurveysForUser invalid user');
      throw new BadRequestException('Invalid user');
    }

    // Return all surveys where the user is a collaborator
    // Be tolerant of legacy data that stored collaborators as strings by matching both types using aggregation ($expr avoids Mongoose casting)
    const uidStr = userId && (userId as any).toString ? (userId as any).toString() : String(userId);
    const uidObj = (userId instanceof Types.ObjectId) ? userId : (Types.ObjectId.isValid(uidStr) ? new Types.ObjectId(uidStr) : null);

    const matchStage: any = {
      $or: [
        ...(uidObj ? [{ collaborators: uidObj }] : []), // match ObjectId entries when possible
        { $expr: { $in: [uidStr, '$collaborators'] } },  // match legacy string entries exactly
      ],
    };

    const results = await this.surveyModel.aggregate([{ $match: matchStage }]).exec();
    const asObjIdCount = await this.surveyModel.countDocuments({ collaborators: userId }).exec();
    const asStringCount = await this.surveyModel.countDocuments({ collaborators: uidStr as any }).exec();
    console.log('[SurveysService] Returning surveys for user by collaborators', {
      count: results?.length,
      counts: { asObjIdCount, asStringCount },
    });

    // Diagnostics: if empty, try to detect string-typed collaborators
    if (!results || results.length === 0) {
      // Re-run a plain find to collect type diagnostics without casting surprises
      const sampleStringMatches = await this.surveyModel
        .find({}, { _id: 1, collaborators: 1 })
        .limit(50)
        .lean()
        .exec();
      const hits = (sampleStringMatches || []).filter((d: any) => Array.isArray(d?.collaborators) && d.collaborators.includes(uidStr));
      const typedSamples = hits.slice(0, 3).map((d: any) => ({
        id: d?._id?.toString?.() ?? String(d?._id),
        collabTypes: d.collaborators.map((c: any) => (typeof c === 'string' ? 'string' : (c && c._bsontype === 'ObjectID' ? 'ObjectId' : typeof c))),
        collabSample: d.collaborators.slice(0, 3).map((c: any) => (c && c.toString ? c.toString() : String(c))),
      }));
      if (typedSamples.length > 0) {
        console.log('[SurveysService][Diag] Found string-collaborator matches via lean scan', typedSamples);
      } else {
        console.log('[SurveysService][Diag] No string-collaborator matches found in sample scan for', { uidStr });
      }
    }
    return results;
  }

  async getAllSurveysAdmin(): Promise<Survey[] | undefined> {
    console.log('[SurveysService] getAllSurveysAdmin() called');
    return this.surveyModel.find().exec();
  }

  async findSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
  ): Promise<Survey | undefined> {
    try {
      const user = await this.coreService.getUserById(userId);
      const survey = await this.coreService.getSurveyById(surveyId);

      if (!this.coreLogicService.validateSurveyOwnership(user, survey)) {
        throw new InternalServerErrorException(
          'Something went wrong getting survey [SS0050]',
        );
      }

      console.log(
        '[DEBUG] Protected Serving survey with ID:',
        surveyId.toString(),
      );
      console.log(
        '[DEBUG] Protected Survey questions IDs:',
        JSON.stringify(survey.questions),
      );

      // Get the full question documents using the same approach as public API
      const questions = await this.coreService.getQuestionsByManyIds(
        survey.questions,
      );
      console.log(
        '[DEBUG] Protected Retrieved',
        questions.length,
        'question documents',
      );

      if (questions.length > 0) {
        questions.forEach((q, idx) => {
          const qa: any = q as any;
          if (qa && qa._id) {
            console.log(
              `[DEBUG] Protected Question ${idx}: ID=${qa._id.toString()}, Type=${
                qa.type
              }, QuestionType=${qa.setting?.questionType}`,
            );
          } else {
            console.log(
              `[DEBUG] Protected Question ${idx}: INVALID or MISSING`,
            );
          }
        });
      }

      const tempQuestionDocumentList = [];

      // Process each question (copied from servePublicSurveyById)
      questions.forEach((question) => {
        if (!question) {
          console.log('Skipping undefined question');
          return;
        }

        if ((question as any).setting && (question as any).setting.questionType === 'qv') {
          try {
            const qAny: any = question as any;
            if (qAny.get && qAny.get('setting.sampleOption')) {
              const sampleCount = qAny.get('setting.sampleOption');
              const allOptions = qAny.get('options');

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

      // Merge questions with their IDs in survey - same as public API
      const mergedQuestions = this.coreLogicService.mergeIdListWithDocList(
        survey.questions,
        tempQuestionDocumentList,
        [], // Don't remove any fields for protected API
      );

      console.log(
        '[DEBUG] Protected Original question IDs count:',
        survey.questions?.length,
      );
      console.log(
        '[DEBUG] Protected Merged questions count:',
        mergedQuestions?.length,
      );

      if (mergedQuestions.length > 0) {
        const sample = mergedQuestions[0];
        console.log('[DEBUG] Protected Sample merged question:', {
          id: sample._id?.toString(),
          type: sample.type,
          optionsCount: sample.options?.length || 0,
        });
      }

      // Create a plain JavaScript object without Mongoose schema constraints, same as public API
      const plainSurvey = survey.toObject
        ? survey.toObject()
        : JSON.parse(JSON.stringify(survey));

      // Override the questions with the merged question objects
      plainSurvey.questions = mergedQuestions.map((q) => {
        return q.toObject ? q.toObject() : JSON.parse(JSON.stringify(q));
      });

      console.log(
        '[DEBUG] Protected Plain survey object created with',
        plainSurvey.questions.length,
        'questions',
      );

      if (plainSurvey.questions.length > 0) {
        const sampleQ = plainSurvey.questions[0];
        console.log(
          '[DEBUG] Protected Sample question keys:',
          Object.keys(sampleQ).join(', '),
        );
        if (sampleQ.options && Array.isArray(sampleQ.options)) {
          console.log(
            '[DEBUG] Protected Sample question has',
            sampleQ.options.length,
            'options',
          );
        }
      }

      return plainSurvey;
    } catch (error) {
      console.error('Error in protected findSurveyById:', error);
      throw error;
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
      console.log(
        '[DEBUG] Survey questions IDs:',
        JSON.stringify(survey.questions),
      );

      const questions = await this.coreService.getQuestionsByManyIds(
        survey.questions,
      );

      console.log('[DEBUG] Retrieved', questions.length, 'question documents');
      if (questions.length > 0) {
        questions.forEach((q, idx) => {
          const qa: any = q as any;
          if (qa && qa._id) {
            console.log(
              `[DEBUG] Question ${idx}: ID=${qa._id.toString()}, Type=${
                qa.type
              }, QuestionType=${qa.setting?.questionType}`,
            );
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

        if ((question as any).setting && (question as any).setting.questionType === 'qv') {
          try {
            const qAny: any = question as any;
            if (qAny.get && qAny.get('setting.sampleOption')) {
              const sampleCount = qAny.get('setting.sampleOption');
              const allOptions = qAny.get('options');

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
      console.log(
        '[DEBUG] Original question IDs count:',
        survey.questions?.length,
      );
      console.log('[DEBUG] Merged questions count:', mergedQuestions?.length);
      if (mergedQuestions.length > 0) {
        const sample = mergedQuestions[0];
        console.log('[DEBUG] Sample merged question:', {
          id: sample._id?.toString(),
          type: sample.type,
          optionsCount: sample.options?.length || 0,
        });
      }

      // The native array assignment might not work due to Mongoose schema validation
      // Instead, create a new plain JavaScript object without Mongoose's schema constraints
      const plainSurvey = survey.toObject
        ? survey.toObject()
        : JSON.parse(JSON.stringify(survey));

      // Now override the questions with the merged question objects
      plainSurvey.questions = mergedQuestions.map((q) => {
        return q.toObject ? q.toObject() : JSON.parse(JSON.stringify(q));
      });

      // Log details about the plain survey object
      console.log(
        '[DEBUG] Plain survey object created with',
        plainSurvey.questions.length,
        'questions',
      );
      if (plainSurvey.questions.length > 0) {
        const sampleQ = plainSurvey.questions[0];
        console.log(
          '[DEBUG] Sample question keys:',
          Object.keys(sampleQ).join(', '),
        );
        if (sampleQ.options && Array.isArray(sampleQ.options)) {
          console.log(
            '[DEBUG] Sample question has',
            sampleQ.options.length,
            'options',
          );
        }
      }

      // Check if survey.questions is still an array of objects after assignment
      console.log(
        '[DEBUG] After assignment - survey.questions type:',
        typeof survey.questions,
      );
      console.log(
        '[DEBUG] After assignment - survey.questions is array:',
        Array.isArray(survey.questions),
      );
      if (Array.isArray(survey.questions) && survey.questions.length > 0) {
        const firstItem = survey.questions[0];
        console.log(
          '[DEBUG] First item type after assignment:',
          typeof firstItem,
        );
        console.log(
          '[DEBUG] First item is ObjectId:',
          firstItem instanceof Types.ObjectId,
        );
        console.log('[DEBUG] First item has properties:');
        if (typeof firstItem === 'object' && firstItem !== null) {
          console.log('[DEBUG] Keys:', Object.keys(firstItem).join(', '));
          if ('options' in firstItem) {
            console.log(
              '[DEBUG] Has options property:',
              Array.isArray(firstItem.options),
            );
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
      console.log(
        '[DEBUG] Questions array exists:',
        Array.isArray(survey.questions),
      );

      if (Array.isArray(survey.questions)) {
        console.log('[DEBUG] Number of questions:', survey.questions.length);

        // Check the first question if available
        if (survey.questions.length > 0) {
          try {
            const firstQ = survey.questions[0];
            console.log('[DEBUG] First question summary:');

            // Type guard for firstQ to ensure it's an object, not an ObjectId
            if (
              firstQ &&
              typeof firstQ === 'object' &&
              !Types.ObjectId.isValid(firstQ)
            ) {
              // Safe access to properties
              const qId = firstQ._id
                ? typeof firstQ._id === 'object' && firstQ._id !== null
                  ? typeof firstQ._id.toString === 'function'
                    ? firstQ._id.toString()
                    : String(firstQ._id)
                  : String(firstQ._id)
                : 'unknown';

              console.log('[DEBUG] Question ID:', qId);

              // Safe property access with type assertions
              const qType = 'type' in firstQ ? String(firstQ.type) : 'unknown';
              console.log('[DEBUG] Question type:', qType);

              // Check for options array with type guard
              if (
                'options' in firstQ &&
                firstQ.options &&
                Array.isArray(firstQ.options)
              ) {
                console.log(
                  '[DEBUG] Question has',
                  firstQ.options.length,
                  'options',
                );
              } else {
                console.log('[DEBUG] Question has no options array');
              }
            } else {
              console.log(
                '[DEBUG] First question is not a full object, might be an ObjectId',
              );
              if (firstQ && typeof firstQ.toString === 'function') {
                console.log('[DEBUG] ObjectId value:', firstQ.toString());
              }
            }
          } catch (err) {
            console.log(
              '[DEBUG] Error accessing question properties:',
              err.message,
            );
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
    console.log('[SurveysService] createNewSurvey called', { userId: userId?.toString(), title: createSurveyDto?.title });
    const createdSurvey = new this.surveyModel({
      ...createSurveyDto,
      // ensure the creator is a collaborator
      collaborators: [userId],
    });
    const completeCreatedSurvey = await createdSurvey.save();
    console.log('[SurveysService] Survey created', {
      surveyId: completeCreatedSurvey?._id?.toString(),
      creator: userId?.toString(),
    });
    return completeCreatedSurvey;
  }

  /**
   * Admin utility: Backfill missing owners on surveys and rebuild users.surveys from ownership
   */
  // Removed owner-based backfill in simplified collaborator-only model

  async updateSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    updateSurveyDto: UpdateSurveyDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    if (await this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId)) {
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
    if (await this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId)) {
      console.log(
        '[DEBUG] updateSurveyQuestionsById - Raw DTO:',
        JSON.stringify(updateSurveyQuestionsDto),
      );
      console.log(
        '[DEBUG] updateSurveyQuestionsById - Question IDs:',
        Array.isArray(updateSurveyQuestionsDto.questions)
          ? updateSurveyQuestionsDto.questions.map((id) => id.toString())
          : 'Not an array',
      );

      // Convert all IDs to proper MongoDB ObjectIds for storage
      const questionIds = Array.isArray(updateSurveyQuestionsDto.questions)
        ? updateSurveyQuestionsDto.questions.map((id) => {
            if (typeof id === 'string') {
              return new Types.ObjectId(id);
            } else if (id && id.toString && typeof id.toString === 'function') {
              // This ensures we're storing the actual ObjectId reference, not just its string value
              return new Types.ObjectId(id.toString());
            }
            return id;
          })
        : [];

      console.log(
        '[DEBUG] updateSurveyQuestionsById - Final ID list for DB update:',
        questionIds.map((id) => id.toString()),
      );

      // Update the survey document with the proper ObjectIds
      return await this.surveyModel
        .findByIdAndUpdate(
          surveyId,
          { $set: { questions: questionIds } },
          { new: true }, // ensure we get back the updated document
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
        await this.usersService.updateUserbyId(uid, updateUserDto);
      }),
    );
    return await this.surveyModel.findByIdAndRemove(surveyId).exec();
  }
}
