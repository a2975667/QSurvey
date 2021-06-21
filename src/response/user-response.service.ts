import { Survey } from 'src/schemas/survey.schema';
import { QuestionsService } from './../questions/questions.service';
import { SurveysService } from './../surveys/surveys.service';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from './../schemas/surveyResponse.schema';
import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class UserResponseService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(QuestionResponse.name)
    private questionResponseModel: Model<QuestionResponseDocument>,
    private surveysService: SurveysService,
    private questionsService: QuestionsService,
  ) {}

  async createSurveyAndQuestionResponse(
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this.surveysService._findSurveyById(
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
      UKey: createQuestionResponseDto.UKey,
      SKey: createQuestionResponseDto.SKey,
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

  async UpdateSurveyAndCreateQuestionResponse(
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    const SurveyMetadata = await this.surveysService._findSurveyById(
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
      validateSurveyResponse.UKey,
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

  async _findSurveyResponseByUUID(uuid: string) {
    const returnedSurveyResponse = await this.surveyResponseModel
      .findOne({ uuid: uuid })
      .exec();
    if (returnedSurveyResponse) return returnedSurveyResponse;
    else
      throw new BadRequestException(
        'No survey Response with this UUID Found. [SS0122]',
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

  async _findSurveyResponseByUKey(UKey: string) {
    const returnedSurveyResponse = await this.surveyResponseModel
      .findOne({ UKey: UKey })
      .exec();
    if (returnedSurveyResponse) return returnedSurveyResponse;
    else
      throw new BadRequestException('Cannot find survey with UKey. [SS0132]');
  }

  async _IfUkeySurveyResponseExists(UKey: string) {
    try {
      if (await this._findSurveyResponseByUKey(UKey)) return true;
    } catch (BadRequestException) {
      return false;
    }
  }

  _validateSurveyAvaliable(SurveyMetadata: Survey) {
    if (!SurveyMetadata.settings.IsAvaliable)
      throw new BadRequestException('This survey is not avaliable. [URS0145]');
  }

  _validateSKeySetting(
    SurveyMetadata: Survey,
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (
      SurveyMetadata.settings.HasSKey &&
      SurveyMetadata.settings.SKeyValue !== createQuestionResponseDto.SKey
    )
      throw new UnauthorizedException(
        'This survey requires a correct static key. [URS0157]',
      );
  }

  _validateUUIDCorrect(
    surveyResponseId: string,
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (surveyResponseId !== createQuestionResponseDto.uuid)
      throw new BadRequestException(
        'UUID Mismatch when updating question [SS00167]',
      );
  }

  _validateUKeyCorrect(
    surveyMetadata: Survey,
    surveyResponseUKey: string,
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (
      surveyMetadata.settings.HasUKey &&
      createQuestionResponseDto.UKey === undefined
    )
      throw new UnauthorizedException(
        'This survey requires a Unique Key upon submission. [URS0181]',
      );
    if (
      surveyMetadata.settings.HasUKey &&
      surveyResponseUKey !== createQuestionResponseDto.UKey
    )
      throw new UnauthorizedException(
        'UKey value does not match uuid survey UKey [URS0188]',
      );
  }

  async _validateUKeyUnique(
    SurveyMetadata: Survey,
    createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (
      SurveyMetadata.settings.HasUKey &&
      createQuestionResponseDto.UKey === undefined
    )
      throw new UnauthorizedException(
        'This survey requires a Unique Key upon submission. [URS0201]',
      );

    if (
      SurveyMetadata.settings.HasUKey &&
      (await this._IfUkeySurveyResponseExists(createQuestionResponseDto.UKey))
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
}
