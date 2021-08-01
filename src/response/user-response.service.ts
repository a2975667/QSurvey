import { RemoveQuestionResponseDto } from './dto/removeQuestionResponse.dto';
import { Survey, SurveyDocument } from 'src/schemas/survey.schema';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from './../schemas/surveyResponse.schema';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  QuestionResponse,
  QuestionResponseDocument,
} from 'src/schemas/questionResponse.schema';
import { v4 as uuidv4 } from 'uuid';
import { CreateQuestionResponseDto } from './dto/createQuestionResponse.dto';
import { UpdateQuestionResponseDto } from './dto/updateQuestionResponse.dto';
import { CompleteSurveyResponseDto } from './dto/completeSurveyResponse.dto';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { GetUserSurveyResponseDTO } from './dto/getUserSurveyFullResponse.dto';

@Injectable()
export class UserResponseService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(QuestionResponse.name)
    private questionResponseModel: Model<QuestionResponseDocument>,
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
  ) {}

  // async getIncompleteSurveyResponseByUkey(uKey: string) {
  //   const response = await this._findSurveyResponseByUKey(uKey);
  //   if (response.status === 'Completed') {
  //     throw new BadRequestException('The survey has been submitted. [SS043]');
  //   } else {
  //     return response;
  //   }
  // }

  async getIncompleteSurveyResponseByUUID(
    getUserSurveyResponseDTO: GetUserSurveyResponseDTO,
  ) {
    const response = await this._findSurveyResponseByUUID(
      getUserSurveyResponseDTO.uuid,
    );

    if (response.status === 'Complete') {
      throw new BadRequestException('The survey has been submitted. [SS045]');
    } // we should check time value here to be consistent. Low priority fix.

    const surveySettings = (await this._findSurveyById(response.surveyId))
      .settings;

    if (
      surveySettings.hasUKey ||
      getUserSurveyResponseDTO.uKey !== response.uKey
    ) {
      if (getUserSurveyResponseDTO.uKey !== response.uKey) {
        throw new BadRequestException(
          'The survey uKey does not match. [SS064]',
        );
      }
    }

    if (
      surveySettings.hasSKey ||
      getUserSurveyResponseDTO.sKey !== response.sKey
    ) {
      if (getUserSurveyResponseDTO.sKey !== surveySettings.sKeyValue) {
        throw new BadRequestException(
          'The survey sKey does not match Survey sKey Value. [SS064]',
        );
      }
    }

    const questionResponses = [];
    await Promise.all(
      response.questionResponses.map(async (questionResponseId) => {
        try {
          const qResponse = await this._findQuestionResponseByqid(
            questionResponseId,
          );
          questionResponses.push(qResponse);
          console.log(qResponse);
        } catch (BadRequestException) {
          throw new BadRequestException(
            'Something critical went wrong when building survey response uuid: ' +
              getUserSurveyResponseDTO.uuid +
              ' with questionResponse: ' +
              questionResponseId +
              ' [UR0088]',
          );
        }
      }),
    );
    return { surveyResponse: response, questionResponse: questionResponses };
  }

  // async getQuestionResponseByQRID(
  //   uuid: string,
  //   questionResponseId: Types.ObjectId,
  // ) {
  //   const response = await this._findSurveyResponseByUUID(uuid);
  //   if (response.status === 'Completed') {
  //     throw new BadRequestException('The survey has been submitted. [SS064]');
  //   } else {
  //     return await this.questionResponseModel.findById(questionResponseId);
  //   }
  // }

  async createSurveyAndQuestionResponse(
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this._findSurveyById(
      createQuestionResponseDto.surveyId,
    );

    // start series of validation check
    this._validateSurveyAvaliable(SurveyMetadata);
    this._validateSKeySetting(SurveyMetadata, createQuestionResponseDto);
    await this._validateUKeyUnique(SurveyMetadata, createQuestionResponseDto);
    // end check

    const newQuestionResponse = await new this.questionResponseModel({
      questionId: createQuestionResponseDto.questionId,
      createdTime: new Date().toISOString(),
      expireCountdown: 7 * 24 * 60 * 60,
      responseContent: createQuestionResponseDto.responseContent,
    }).save();

    const newSurveyResponse = new this.surveyResponseModel({
      uuid: uuidv4(),
      surveyId: createQuestionResponseDto.surveyId,
      uKey: createQuestionResponseDto.uKey,
      sKey: createQuestionResponseDto.sKey,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      status: 'Incomplete',
      expireCountdown: 7 * 24 * 60 * 60,
      questionResponses: [newQuestionResponse._id],
    });

    return {
      surveyResponse: await newSurveyResponse.save(),
      questionResponse: newQuestionResponse,
    };
  }

  async CreateQuestionAndUpdateSurveyResponse(
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this._findSurveyById(
      createQuestionResponseDto.surveyId,
    );
    const validateSurveyResponse = await this._findSurveyResponseByUUID(
      createQuestionResponseDto.uuid,
    );

    // start series of validation check
    this._validateSurveyAvaliable(SurveyMetadata);
    this._validateSKeySetting(SurveyMetadata, createQuestionResponseDto);
    this._validateUUIDCorrect(
      validateSurveyResponse.uuid,
      createQuestionResponseDto,
    );
    this._validateUKeyCorrect(
      SurveyMetadata,
      validateSurveyResponse.uKey,
      createQuestionResponseDto,
    );
    // TODO: should validate question not being answered before to prevent duplicated call
    // end check

    const newQuestionResponse = await new this.questionResponseModel({
      surveyResponseId: validateSurveyResponse._id,
      questionId: createQuestionResponseDto.questionId,
      createdTime: new Date().toISOString(),
      expireCountdown: 7 * 24 * 60 * 60,
      responseContent: createQuestionResponseDto.responseContent,
    }).save();

    const updatedSurveyResponse = await this._pushQuestionResponseIntoSurveyResponse(
      newQuestionResponse._id,
      createQuestionResponseDto.surveyResponseId,
    );

    return {
      surveyResponse: updatedSurveyResponse,
      questionResponse: newQuestionResponse,
    };
  }

  async updateQuestionResponse(
    updateQuestionResponseDto: UpdateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this._findSurveyById(
      updateQuestionResponseDto.surveyId,
    );
    const validateSurveyResponse = await this._findSurveyResponseByID(
      updateQuestionResponseDto.surveyResponseId,
    );

    //validations
    this._validateSurveyAvaliable(SurveyMetadata);
    this._validateSKeySetting(SurveyMetadata, updateQuestionResponseDto);
    this._validateUKeyCorrect(
      SurveyMetadata,
      validateSurveyResponse.uKey,
      updateQuestionResponseDto,
    );
    this._validateUUIDCorrect(
      validateSurveyResponse.uuid,
      updateQuestionResponseDto,
    );

    const updatedQuestionResponse = await this.questionResponseModel
      .findByIdAndUpdate(
        updateQuestionResponseDto.questionResponseId,
        {
          responseContent: updateQuestionResponseDto.responseContent,
        },
        { returnOriginal: false },
      )
      .exec();
    return updatedQuestionResponse;
  }

  async removeQuestionResponse(
    removeQuestionResponseDto: RemoveQuestionResponseDto,
  ) {
    const SurveyMetadata = await this._findSurveyById(
      removeQuestionResponseDto.surveyId,
    );
    const validateSurveyResponse = await this._findSurveyResponseByID(
      removeQuestionResponseDto.surveyResponseId,
    );

    //validations
    this._validateSurveyAvaliable(SurveyMetadata);
    this._validateSKeySetting(SurveyMetadata, removeQuestionResponseDto);
    this._validateUKeyCorrect(
      SurveyMetadata,
      validateSurveyResponse.uKey,
      removeQuestionResponseDto,
    );
    this._validateUUIDCorrect(
      validateSurveyResponse.uuid,
      removeQuestionResponseDto,
    );

    const updatedSurveyResponse = await this._removeQuestionResposneIdFromSurveyResponse(
      removeQuestionResponseDto.questionResponseId,
      validateSurveyResponse,
    );

    const removeQuestionResponse = await this._removeQuestionResponseById(
      removeQuestionResponseDto.questionResponseId,
    );

    if (!removeQuestionResponse)
      throw new BadRequestException(
        'This Question Response does not exist [URS0185]',
      );

    return updatedSurveyResponse;
  }

  async markSurveyResponseAsCompleted(
    completeSurveyResponseDto: CompleteSurveyResponseDto,
  ) {
    const SurveyMetadata = await this._findSurveyById(
      completeSurveyResponseDto.surveyId,
    );
    const validateSurveyResponse = await this._findSurveyResponseByID(
      completeSurveyResponseDto.surveyResponseId,
    );

    //validations
    this._validateSurveyAvaliable(SurveyMetadata);
    this._validateSKeySetting(SurveyMetadata, completeSurveyResponseDto);
    this._validateUKeyCorrect(
      SurveyMetadata,
      validateSurveyResponse.uKey,
      completeSurveyResponseDto,
    );
    this._validateUUIDCorrect(
      validateSurveyResponse.uuid,
      completeSurveyResponseDto,
    );

    const questionsToUpdate = validateSurveyResponse.questionResponses;
    await Promise.all(
      questionsToUpdate.map(async (questionResponseId) => {
        await this._setQuestionResponseToComplete(questionResponseId);
      }),
    );

    const surveyResponse = await this.surveyResponseModel.findByIdAndUpdate(
      completeSurveyResponseDto.surveyResponseId,
      {
        endTime: new Date(),
        status: 'Complete',
        $unset: { expireCountdown: '' },
      },
      { returnOriginal: false, strict: false },
    );
    // for all question response, update them to remove expieration dateTime
    // push questionResponse to questionid
    // update Survey Response to complete and extend experation time
    return surveyResponse;
  }

  async _findSurveyResponseByUUID(
    uuid: string,
  ): Promise<SurveyResponseDocument | undefined> {
    const returnedSurveyResponse = await this.surveyResponseModel
      .findOne({ uuid: uuid })
      .exec();
    if (returnedSurveyResponse) return returnedSurveyResponse;
    else
      throw new BadRequestException(
        'No survey Response with this UUID Found. [SS0122]',
      );
  }

  async _findQuestionResponseByqid(
    questionId: Types.ObjectId,
  ): Promise<QuestionResponseDocument | undefined> {
    const returnedQuestionResponse = await this.questionResponseModel
      .findById(questionId)
      .exec();
    if (returnedQuestionResponse) return returnedQuestionResponse;
    else
      throw new BadRequestException(
        'Something critical failed when fetching questionid: ' +
          questionId +
          ' [US0324]',
      );
  }

  async _findSurveyResponseByID(id: Types.ObjectId) {
    const returnedSurveyResponse = await this.surveyResponseModel
      .findById(id)
      .exec();
    if (returnedSurveyResponse) return returnedSurveyResponse;
    else
      throw new BadRequestException(
        'Survey Response with this ID does not exist [SS0133]',
      );
  }

  async _findSurveyResponseByUKey(uKey: string) {
    const returnedSurveyResponse = await this.surveyResponseModel
      .findOne({ uKey: uKey })
      .exec();
    if (returnedSurveyResponse) return returnedSurveyResponse;
    else
      throw new BadRequestException('Cannot find survey with uKey. [SS0132]');
  }

  async _IfUkeySurveyResponseExists(uKey: string) {
    try {
      if (await this._findSurveyResponseByUKey(uKey)) return true;
    } catch (BadRequestException) {
      return false;
    }
  }

  _validateSurveyAvaliable(SurveyMetadata: Survey) {
    if (!SurveyMetadata.settings.isAvaliable)
      throw new BadRequestException('This survey is not avaliable. [URS0145]');
  }

  _validateSKeySetting(
    SurveyMetadata: Survey,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | RemoveQuestionResponseDto
      | CompleteSurveyResponseDto,
  ) {
    if (
      SurveyMetadata.settings.hasSKey &&
      SurveyMetadata.settings.sKeyValue !== createQuestionResponseDto.sKey
    )
      throw new UnauthorizedException(
        'This survey requires a correct static key. [URS0157]',
      );
  }

  _validateUUIDCorrect(
    surveyResponseId: string,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | RemoveQuestionResponseDto
      | CompleteSurveyResponseDto,
  ) {
    if (surveyResponseId !== createQuestionResponseDto.uuid)
      throw new BadRequestException(
        'UUID Mismatch when updating question [SS00167]',
      );
  }

  _validateUKeyCorrect(
    surveyMetadata: Survey,
    surveyResponseUKey: string,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | RemoveQuestionResponseDto
      | CompleteSurveyResponseDto,
  ) {
    if (
      surveyMetadata.settings.hasUKey &&
      createQuestionResponseDto.uKey === undefined
    )
      throw new UnauthorizedException(
        'This survey requires a Unique Key upon submission. [URS0181]',
      );
    if (
      surveyMetadata.settings.hasUKey &&
      surveyResponseUKey !== createQuestionResponseDto.uKey
    )
      throw new UnauthorizedException(
        'uKey value does not match uuid survey uKey [URS0188]',
      );
  }

  async _validateUKeyUnique(
    SurveyMetadata: Survey,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | CompleteSurveyResponseDto,
  ) {
    if (
      SurveyMetadata.settings.hasUKey &&
      createQuestionResponseDto.uKey === undefined
    )
      throw new UnauthorizedException(
        'This survey requires a Unique Key upon submission. [URS0201]',
      );

    if (
      SurveyMetadata.settings.hasUKey &&
      (await this._IfUkeySurveyResponseExists(createQuestionResponseDto.uKey))
    )
      throw new UnauthorizedException(
        'This survey unique key has been consumed. [URS0208]',
      );
  }

  async _pushQuestionResponseIntoSurveyResponse(
    questionResponseId: Types.ObjectId,
    surveyResponseId: Types.ObjectId,
  ) {
    return this.surveyResponseModel
      .findByIdAndUpdate(
        surveyResponseId,
        {
          $push: { questionResponses: questionResponseId },
        },
        { returnOriginal: false },
      )
      .exec();
  }

  async _removeQuestionResposneIdFromSurveyResponse(
    questionResponseId: Types.ObjectId,
    surveyResponse: SurveyResponseDocument,
  ) {
    const updatedQuestionResponses = surveyResponse.questionResponses;
    const responseIndex = updatedQuestionResponses.indexOf(questionResponseId);
    if (responseIndex >= 0) updatedQuestionResponses.splice(responseIndex, 1);
    return this.surveyResponseModel.findByIdAndUpdate(
      surveyResponse._id,
      {
        questionResponses: updatedQuestionResponses,
      },
      { returnOriginal: false },
    );
  }

  async _removeQuestionResponseById(questionResponseId: Types.ObjectId) {
    return this.questionResponseModel.findByIdAndRemove(questionResponseId);
  }

  async _setQuestionResponseToComplete(questionResponseId: Types.ObjectId) {
    const thisQuestionResponse = await this.questionResponseModel.findById(
      questionResponseId,
    );

    const updatedQuestions = await this.questionResponseModel.findByIdAndUpdate(
      questionResponseId,
      { $unset: { expireCountdown: '' } },
      { returnOriginal: false, strict: false },
    );
    if (!updatedQuestions)
      throw new InternalServerErrorException(
        'critical failiure updating questionResponse at the following QRID: ' +
          questionResponseId +
          ' [URS0397]',
      );
    const thisQuestionId = thisQuestionResponse.questionId;
    const updateQuestion = await this.questionModel.findByIdAndUpdate(
      thisQuestionId,
      {
        $push: { responses: questionResponseId },
      },
      { returnOriginal: false },
    );
    if (!updateQuestion)
      throw new InternalServerErrorException(
        'critical failiure updating question with the following QRID: ' +
          questionResponseId +
          ' [URS406]',
      );
    return true;
  }

  async _findSurveyById(surveyId: Types.ObjectId): Promise<Survey | undefined> {
    const returnedSurvey = await this.surveyModel
      .findOne({ _id: surveyId })
      .exec();
    if (returnedSurvey) {
      return returnedSurvey;
    } else {
      throw new BadRequestException('Cannot Find Survey. [SS0040]');
    }
  }
}
