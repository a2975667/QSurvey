import { CompleteSurveyResponseDto } from './dto/completeSurveyResponse.dto';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { CreateQuestionResponseDto } from './dto/createQuestionResponse.dto';
import { GetUserSurveyResponseDTO } from './dto/getUserSurveyFullResponse.dto';
import {
  GetCompletedSurveyResponseQueryDto,
  GetCompletedSurveyResultsQueryDto,
} from './dto/getCompletedSurveyResponse.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { RemoveQuestionResponseDto } from './dto/removeQuestionResponse.dto';
import { SurveyDocument } from 'src/schemas/survey.schema';
import { UpdateQuestionResponseDto } from './dto/updateQuestionResponse.dto';
import { v4 as uuidv4 } from 'uuid';
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
import {
  QuestionResponse,
  QuestionResponseDocument,
} from 'src/schemas/questionResponse.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { Role } from 'src/auth/roles/role.enum';
import { SurveyResultsQueryDto } from 'src/surveys/dtos/surveyResultsQuery.dto';
import { ResponseTypeLikert } from './dto/likert-response.dto';
import { ResponseTypeQV } from './dto/qv-response.dto';
import { ResponseTypeText } from './dto/text-response.dto';
import { CreateBatchQuestionResponsesDto } from './dto/createBatchQuestionResponses.dto';

@Injectable()
export class UserResponseService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(QuestionResponse.name)
    private questionResponseModel: Model<QuestionResponseDocument>,
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
    private surveysService: SurveysService,
  ) {}

  // getIncompleteSurveyResponseByUkey disallowed

  async getIncompleteSurveyResponseByUUID(
    getUserSurveyResponseDTO: GetUserSurveyResponseDTO,
  ) {
    const surveyResponse = await this.coreService.getSurveyResponseByUUID(
      getUserSurveyResponseDTO.uuid,
    );
    this.coreLogicService.validateUUIDAvaliable(surveyResponse);

    this._ensureSurveyAssociation(
      surveyResponse,
      getUserSurveyResponseDTO.surveyId,
    );

    const surveyObjectId = new Types.ObjectId(
      getUserSurveyResponseDTO.surveyId,
    );
    const survey = await this.coreService.getSurveyById(surveyObjectId);
    this.coreLogicService.validateSurveySKey(
      survey,
      getUserSurveyResponseDTO.sKey,
    );
    if (survey.settings.hasUKey || getUserSurveyResponseDTO.uKey) {
      this.coreLogicService.validateSurveyResponseUKey(
        surveyResponse,
        getUserSurveyResponseDTO.uKey,
      );
    }

    const questionResponses = await this.coreService.getQuestionResponsesByManyIds(
      surveyResponse.questionResponses,
    );
    surveyResponse.questionResponses = this.coreLogicService.mergeIdListWithDocList(
      surveyResponse.questionResponses,
      questionResponses,
    );

    return surveyResponse;
  }

  async getCompletedSurveyResponseSnapshot(
    request: GetCompletedSurveyResponseQueryDto & { uuid: string },
  ) {
    const surveyResponse = await this.coreService.getSurveyResponseByUUID(
      request.uuid,
    );
    if (!surveyResponse) {
      throw new BadRequestException('Survey response not found [URS0501]');
    }

    this._ensureSurveyAssociation(surveyResponse, request.surveyId);

    if (surveyResponse.status !== 'Complete') {
      throw new BadRequestException(
        'Survey response is not marked complete yet [URS0505]',
      );
    }

    const surveyObjectId = new Types.ObjectId(request.surveyId);
    const survey = await this.coreService.getSurveyById(surveyObjectId);
    if (!survey) {
      throw new BadRequestException('Survey not found [URS0510]');
    }

    this.coreLogicService.validateSurveySKey(survey, request.sKey);
    if (survey.settings.hasUKey || request.uKey) {
      this.coreLogicService.validateSurveyResponseUKey(
        surveyResponse,
        request.uKey,
      );
    }

    const questionResponses = await this.coreService.getQuestionResponsesByManyIds(
      surveyResponse.questionResponses,
    );

    const serializedQuestionResponses = questionResponses.map((qr) => {
      const doc = qr.toObject ? qr.toObject() : (qr as any);
      return {
        _id: doc._id?.toString?.() ?? '',
        questionId: doc.questionId?.toString?.() ?? '',
        createdTime: doc.createdTime
          ? new Date(doc.createdTime).toISOString()
          : null,
        responseContent: doc.responseContent ?? null,
      };
    });

    return {
      surveyResponseId: surveyResponse._id.toString(),
      uuid: surveyResponse.uuid,
      uKey: surveyResponse.uKey,
      surveyId: surveyResponse.surveyId?.toString?.() ?? request.surveyId,
      status: surveyResponse.status,
      endTime: surveyResponse.endTime
        ? new Date(surveyResponse.endTime).toISOString()
        : null,
      submittedAt: surveyResponse.endTime
        ? new Date(surveyResponse.endTime).toISOString()
        : null,
      respondentId: surveyResponse.uuid || surveyResponse.uKey || null,
      questionResponses: serializedQuestionResponses,
    };
  }

  async getCompletedSurveyAggregates(
    request: GetCompletedSurveyResultsQueryDto & { uuid: string },
  ) {
    const surveyResponse = await this.coreService.getSurveyResponseByUUID(
      request.uuid,
    );
    if (!surveyResponse) {
      throw new BadRequestException('Survey response not found [URS0550]');
    }

    this._ensureSurveyAssociation(surveyResponse, request.surveyId);

    if (surveyResponse.status !== 'Complete') {
      throw new BadRequestException(
        'Survey response is not marked complete yet [URS0551]',
      );
    }

    const surveyObjectId = new Types.ObjectId(request.surveyId);
    const survey = await this.coreService.getSurveyById(surveyObjectId);
    if (!survey) {
      throw new BadRequestException('Survey not found [URS0552]');
    }

    this.coreLogicService.validateSurveySKey(survey, request.sKey);
    if (survey.settings.hasUKey || request.uKey) {
      this.coreLogicService.validateSurveyResponseUKey(
        surveyResponse,
        request.uKey,
      );
    }

    const asOf = surveyResponse.endTime
      ? new Date(surveyResponse.endTime).toISOString()
      : new Date().toISOString();

    const query: SurveyResultsQueryDto = {
      questionId: request.questionId,
      limit: request.limit,
      cursor: request.cursor,
      status: 'Complete',
      asOf,
    };

    return this.surveysService.getSurveyResults(
      '000000000000000000000000',
      [Role.Admin],
      request.surveyId,
      query,
    );
  }

  async createSurveyAndQuestionResponse(
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this.coreService.getSurveyById(
      createQuestionResponseDto.surveyId,
    );

    // start series of validation check
    this._validateSurveyAvaliable(SurveyMetadata);
    this._validateSKeySetting(SurveyMetadata, createQuestionResponseDto);
    await this._validateUKeyUnique(SurveyMetadata, createQuestionResponseDto);
    // end check

    const normalizedResponseContent = this._normalizeResponseContent(
      createQuestionResponseDto.responseContent,
    );

    const newQuestionResponse = await new this.questionResponseModel({
      questionId: createQuestionResponseDto.questionId,
      createdTime: new Date().toISOString(),
      expireCountdown: 7 * 24 * 60 * 60,
      responseContent: normalizedResponseContent,
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
    const SurveyMetadata = await this.coreService.getSurveyById(
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

    const normalizedResponseContent = this._normalizeResponseContent(
      createQuestionResponseDto.responseContent,
    );

    const newQuestionResponse = await new this.questionResponseModel({
      surveyResponseId: validateSurveyResponse._id,
      questionId: createQuestionResponseDto.questionId,
      createdTime: new Date().toISOString(),
      expireCountdown: 7 * 24 * 60 * 60,
      responseContent: normalizedResponseContent,
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

  async createBatchSurveyResponses(
    createBatchQuestionResponsesDto: CreateBatchQuestionResponsesDto,
  ) {
    const surveyMetadata = await this.coreService.getSurveyById(
      createBatchQuestionResponsesDto.surveyId,
    );

    this._validateSurveyAvaliable(surveyMetadata);
    this._validateSKeySetting(surveyMetadata, createBatchQuestionResponsesDto);

    let surveyResponse = null as SurveyResponseDocument | null;

    if (createBatchQuestionResponsesDto.uuid) {
      surveyResponse = await this._findSurveyResponseByUUID(
        createBatchQuestionResponsesDto.uuid,
      );

      this._ensureSurveyAssociation(
        surveyResponse,
        createBatchQuestionResponsesDto.surveyId.toString(),
      );

      this._validateUUIDCorrect(
        surveyResponse.uuid,
        createBatchQuestionResponsesDto,
      );

      this._validateUKeyCorrect(
        surveyMetadata,
        surveyResponse.uKey,
        createBatchQuestionResponsesDto,
      );

      if (
        createBatchQuestionResponsesDto.surveyResponseId &&
        surveyResponse._id.toString() !==
          createBatchQuestionResponsesDto.surveyResponseId.toString()
      ) {
        throw new BadRequestException(
          'Survey response mismatch for provided UUID [URS0601]',
        );
      }
    } else {
      await this._validateUKeyUnique(
        surveyMetadata,
        createBatchQuestionResponsesDto,
      );

      surveyResponse = await new this.surveyResponseModel({
        uuid: uuidv4(),
        surveyId: createBatchQuestionResponsesDto.surveyId,
        uKey: createBatchQuestionResponsesDto.uKey,
        sKey: createBatchQuestionResponsesDto.sKey,
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        status: 'Incomplete',
        expireCountdown: 7 * 24 * 60 * 60,
        questionResponses: [],
      }).save();
    }

    const createdQuestionResponses: QuestionResponseDocument[] = [];
    const questionResponseIds: Types.ObjectId[] = [];

    for (const response of createBatchQuestionResponsesDto.responses) {
      const normalizedContent = this._normalizeResponseContent(
        response.responseContent,
      );

      const questionResponse = await new this.questionResponseModel({
        surveyResponseId: surveyResponse._id,
        questionId: response.questionId,
        createdTime: new Date().toISOString(),
        expireCountdown: 7 * 24 * 60 * 60,
        responseContent: normalizedContent,
      }).save();

      createdQuestionResponses.push(questionResponse);
      questionResponseIds.push(questionResponse._id);
    }

    const updatedSurveyResponse = await this.surveyResponseModel
      .findByIdAndUpdate(
        surveyResponse._id,
        {
          $push: { questionResponses: { $each: questionResponseIds } },
          lastUpdate: new Date().toISOString(),
        },
        { returnOriginal: false },
      )
      .exec();

    const baseSurveyResponse = (updatedSurveyResponse ?? surveyResponse).toObject
      ? (updatedSurveyResponse ?? surveyResponse).toObject()
      : (updatedSurveyResponse ?? surveyResponse);

    const surveyResponseResult = {
      ...baseSurveyResponse,
      _id:
        baseSurveyResponse._id?.toString?.() ??
        baseSurveyResponse._id ??
        undefined,
      surveyId:
        baseSurveyResponse.surveyId?.toString?.() ??
        baseSurveyResponse.surveyId,
      questionResponses: Array.isArray(baseSurveyResponse.questionResponses)
        ? baseSurveyResponse.questionResponses.map((qrId: any) =>
            qrId?.toString?.() ?? qrId,
          )
        : baseSurveyResponse.questionResponses,
    };

    const serializedQuestionResponses = createdQuestionResponses.map((qr) => {
      const obj = qr.toObject ? qr.toObject() : (qr as any);
      return {
        ...obj,
        _id: obj._id?.toString?.() ?? obj._id,
        questionId: obj.questionId?.toString?.() ?? obj.questionId,
        surveyResponseId:
          obj.surveyResponseId?.toString?.() ?? obj.surveyResponseId,
      };
    });

    return {
      surveyResponse: surveyResponseResult,
      questionResponses: serializedQuestionResponses,
    };
  }

  async updateQuestionResponse(
    updateQuestionResponseDto: UpdateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this.coreService.getSurveyById(
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

    const normalizedResponseContent = this._normalizeResponseContent(
      updateQuestionResponseDto.responseContent,
    );

    const updatedQuestionResponse = await this.questionResponseModel
      .findByIdAndUpdate(
        updateQuestionResponseDto.questionResponseId,
        {
          responseContent: normalizedResponseContent,
        },
        { returnOriginal: false },
      )
      .exec();
    return updatedQuestionResponse;
  }

  async removeQuestionResponse(
    removeQuestionResponseDto: RemoveQuestionResponseDto,
  ) {
    const SurveyMetadata = await this.coreService.getSurveyById(
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
    const SurveyMetadata = await this.coreService.getSurveyById(
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

  private _normalizeResponseContent(
    rawContent: ResponseTypeQV | ResponseTypeLikert | ResponseTypeText,
  ): ResponseTypeQV | ResponseTypeLikert | ResponseTypeText {
    if (!rawContent) {
      return rawContent;
    }

    if (this._isLikertResponse(rawContent)) {
      return {
        selection: rawContent.selection,
        optionName: rawContent.optionName ?? rawContent.selection,
      };
    }

    if (this._isTextResponse(rawContent)) {
      return {
        text: rawContent.text,
      };
    }

    return rawContent;
  }

  private _isLikertResponse(
    content: any,
  ): content is ResponseTypeLikert {
    return (
      content &&
      typeof content === 'object' &&
      typeof content.selection === 'string' &&
      !Array.isArray((content as ResponseTypeQV).votes)
    );
  }

  private _isTextResponse(content: any): content is ResponseTypeText {
    return (
      content &&
      typeof content === 'object' &&
      typeof content.text === 'string' &&
      !Array.isArray((content as ResponseTypeQV).votes)
    );
  }

  private _ensureSurveyAssociation(
    surveyResponse: SurveyResponseDocument,
    expectedSurveyId: string,
  ) {
    if (!expectedSurveyId) {
      throw new BadRequestException('surveyId is required [URS0490]');
    }

    if (!Types.ObjectId.isValid(expectedSurveyId)) {
      throw new BadRequestException('surveyId is invalid [URS0491]');
    }

    const responseSurveyId = surveyResponse.surveyId
      ? surveyResponse.surveyId.toString()
      : undefined;
    if (!responseSurveyId) {
      throw new BadRequestException(
        'Survey response is missing surveyId [URS0492]',
      );
    }

    if (responseSurveyId !== expectedSurveyId) {
      throw new BadRequestException(
        'Survey response does not belong to provided survey [URS0493]',
      );
    }
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

  _validateSurveyAvaliable(SurveyMetadata: SurveyDocument) {
    if (!SurveyMetadata.settings.isAvailable)
      throw new BadRequestException('This survey is not available. [URS0145]');
  }

  _validateSKeySetting(
    SurveyMetadata: SurveyDocument,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | RemoveQuestionResponseDto
      | CompleteSurveyResponseDto
      | CreateBatchQuestionResponsesDto,
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
    surveyResponseUUID: string,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | RemoveQuestionResponseDto
      | CompleteSurveyResponseDto
      | CreateBatchQuestionResponsesDto,
  ) {
    if (surveyResponseUUID !== createQuestionResponseDto.uuid)
      throw new BadRequestException(
        'UUID Mismatch when updating question [SS00167]',
      );
  }

  _validateUKeyCorrect(
    surveyMetadata: SurveyDocument,
    surveyResponseUKey: string,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | RemoveQuestionResponseDto
      | CompleteSurveyResponseDto
      | CreateBatchQuestionResponsesDto,
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
    SurveyMetadata: SurveyDocument,
    createQuestionResponseDto:
      | CreateQuestionResponseDto
      | UpdateQuestionResponseDto
      | CompleteSurveyResponseDto
      | CreateBatchQuestionResponsesDto,
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
}
