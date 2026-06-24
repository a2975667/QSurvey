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
import { randomUUID } from 'crypto';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from './../schemas/surveyResponse.schema';
import {
  BadRequestException,
  ForbiddenException,
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
import { DuplicateSubmissionError } from './errors';
import { ResponseTypeApproval } from './dto/approval-response.dto';
import { ResponseTypeSelection } from './dto/selection-response.dto';
import { detectQuestionType } from 'src/utils/question-type';
import { resolveEffectiveApprovalLimit } from 'src/utils/approval-limit';

type NavigatorSnapshot = {
  order: string[];
  activeQuestionId?: string;
  completed?: string[];
};

type CompletedParticipantResultsContext = {
  surveyResponse: SurveyResponseDocument;
  survey: any;
  questionResponses: QuestionResponseDocument[];
  answeredQuestionIds: Set<string>;
  sKey?: string;
  uKey?: string;
};

type CompletedParticipantResultsContextMessages = {
  responseNotFound: string;
  responseIncomplete: string;
  surveyNotFound: string;
};

const DEFAULT_COMPLETED_RESULTS_CONTEXT_MESSAGES: CompletedParticipantResultsContextMessages =
  {
    responseNotFound: 'Survey response not found [URS0550]',
    responseIncomplete: 'Survey response is not marked complete yet [URS0551]',
    surveyNotFound: 'Survey not found [URS0552]',
  };

// Supported participant result types. Keep in sync with
// isParticipantResultsSupportedQuestionType in client/src/utils/questionType.ts.
// 'qs' and 'quadratic' are QV variants treated the same as 'qv'.
const PARTICIPANT_RESULTS_SUPPORTED_TYPES = new Set([
  'qv',
  'qs',
  'quadratic',
  'likert',
  'selection',
  'approval',
]);

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

    const questionResponses =
      await this.coreService.getQuestionResponsesByManyIds(
        surveyResponse.questionResponses,
      );
    surveyResponse.questionResponses =
      this.coreLogicService.mergeIdListWithDocList(
        surveyResponse.questionResponses,
        questionResponses,
      );

    return surveyResponse;
  }

  async getCompletedSurveyResponseSnapshot(
    request: GetCompletedSurveyResponseQueryDto & { uuid: string },
  ) {
    const { surveyResponse, questionResponses } =
      await this._resolveCompletedParticipantResultsContext(
        request.uuid,
        request.surveyId,
        {
          responseNotFound: 'Survey response not found [URS0501]',
          responseIncomplete:
            'Survey response is not marked complete yet [URS0505]',
          surveyNotFound: 'Survey not found [URS0510]',
        },
      );

    const serializedQuestionResponses = (questionResponses ?? []).map((qr) => {
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

  async getCompletedSurveyResultsQuestions(
    request: GetCompletedSurveyResponseQueryDto & { uuid: string },
  ) {
    const context = await this._resolveCompletedParticipantResultsContext(
      request.uuid,
      request.surveyId,
    );
    const surveyQuestionIds = Array.isArray(context.survey?.questions)
      ? context.survey.questions
      : [];
    const questionDocs =
      (await this.coreService.getQuestionsByManyIds(surveyQuestionIds)) ?? [];
    const questionById = new Map<string, any>();
    questionDocs.forEach((question: any) => {
      const id = question?._id?.toString?.();
      if (id) {
        questionById.set(id, question);
      }
    });

    const questions = surveyQuestionIds
      .map((rawId: any, index: number) => {
        const id = rawId?._id?.toString?.() ?? rawId?.toString?.();
        if (!id || !context.answeredQuestionIds.has(id)) {
          return null;
        }
        const question = questionById.get(id) ?? rawId;
        if (!this._isParticipantQuestionResultsEnabled(question)) {
          return null;
        }
        const doc = question?.toObject ? question.toObject() : question;
        const type = detectQuestionType(doc, 'unknown');
        const options = Array.isArray(doc?.options)
          ? doc.options
              .map((option: any) => {
                const optionId =
                  typeof option?.optionId === 'string'
                    ? option.optionId
                    : undefined;
                if (!optionId) {
                  return null;
                }
                return {
                  optionId,
                  optionName:
                    typeof option?.optionName === 'string'
                      ? option.optionName
                      : optionId,
                };
              })
              .filter(Boolean)
          : undefined;
        const totalCredits =
          typeof doc?.totalCredits === 'number'
            ? doc.totalCredits
            : typeof doc?.setting?.totalCredits === 'number'
              ? doc.setting.totalCredits
              : undefined;
        return {
          questionId: id,
          label: doc?.question ?? id,
          type,
          position:
            typeof doc?.position === 'number' ? doc.position : index,
          ...(doc?.setting?.labelOverrides
            ? { setting: { labelOverrides: doc.setting.labelOverrides } }
            : {}),
          ...(options && options.length > 0 ? { options } : {}),
          ...(typeof totalCredits === 'number' ? { totalCredits } : {}),
        };
      })
      .filter(Boolean);

    return { questions };
  }

  async getCompletedSurveyAggregates(
    request: GetCompletedSurveyResultsQueryDto & { uuid: string },
  ) {
    const context = await this._resolveCompletedParticipantResultsContext(
      request.uuid,
      request.surveyId,
    );

    await this._validateParticipantQuestionResultsEnabled(
      context.survey,
      request.questionId,
      context.answeredQuestionIds,
    );

    const query: SurveyResultsQueryDto = {
      questionId: request.questionId,
      limit: request.limit,
      cursor: request.cursor,
      status: 'Complete',
    };

    return this.surveysService.getSurveyResults(
      '000000000000000000000000',
      [Role.Admin],
      request.surveyId,
      query,
      { sKey: context.sKey },
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
    const shouldSkip = await this._shouldSkipQuestionResponse(
      createQuestionResponseDto.questionId,
    );
    if (shouldSkip) {
      const newSurveyResponse = new this.surveyResponseModel({
        uuid: randomUUID(),
        surveyId: createQuestionResponseDto.surveyId,
        uKey: createQuestionResponseDto.uKey,
        sKey: createQuestionResponseDto.sKey,
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        status: 'Incomplete',
        expireCountdown: 7 * 24 * 60 * 60,
        questionResponses: [],
      });

      return {
        surveyResponse: await newSurveyResponse.save(),
        questionResponse: null,
      };
    }

    const normalizedResponseContent = this._normalizeResponseContent(
      createQuestionResponseDto.responseContent,
    );
    const filteredResponseContent =
      await this._filterSelectionSelectionsForQuestion(
        await this._filterApprovalSelectionsForQuestion(
          await this._filterQvPlusFollowupsForQuestion(
            await this._filterQvVotesForQuestion(
              normalizedResponseContent,
              createQuestionResponseDto.questionId,
            ),
            createQuestionResponseDto.questionId,
          ),
          createQuestionResponseDto.questionId,
        ),
        createQuestionResponseDto.questionId,
      );

    const navigatorSnapshot = this._sanitizeNavigatorSnapshot(
      createQuestionResponseDto.navigator,
    );

    const newQuestionResponse = await new this.questionResponseModel({
      questionId: createQuestionResponseDto.questionId,
      createdTime: new Date().toISOString(),
      expireCountdown: 7 * 24 * 60 * 60,
      responseContent: filteredResponseContent,
    }).save();

    const newSurveyResponse = new this.surveyResponseModel({
      uuid: randomUUID(),
      surveyId: createQuestionResponseDto.surveyId,
      uKey: createQuestionResponseDto.uKey,
      sKey: createQuestionResponseDto.sKey,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      status: 'Incomplete',
      expireCountdown: 7 * 24 * 60 * 60,
      questionResponses: [newQuestionResponse._id],
      ...(navigatorSnapshot ? { qvNavigator: navigatorSnapshot } : {}),
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
    const shouldSkip = await this._shouldSkipQuestionResponse(
      createQuestionResponseDto.questionId,
    );
    if (shouldSkip) {
      return {
        surveyResponse: validateSurveyResponse,
        questionResponse: null,
      };
    }

    const navigatorSnapshot = this._sanitizeNavigatorSnapshot(
      createQuestionResponseDto.navigator,
    );

    const existingQuestionResponse =
      await this._findQuestionResponseBySurveyAndQuestion(
        validateSurveyResponse._id,
        createQuestionResponseDto.questionId,
      );

    const normalizedResponseContent = this._normalizeResponseContent(
      createQuestionResponseDto.responseContent,
    );
    const filteredResponseContent =
      await this._filterSelectionSelectionsForQuestion(
        await this._filterApprovalSelectionsForQuestion(
          await this._filterQvPlusFollowupsForQuestion(
            await this._filterQvVotesForQuestion(
              normalizedResponseContent,
              createQuestionResponseDto.questionId,
            ),
            createQuestionResponseDto.questionId,
          ),
          createQuestionResponseDto.questionId,
        ),
        createQuestionResponseDto.questionId,
      );

    if (existingQuestionResponse) {
      const updatedQuestionResponse = await this.questionResponseModel
        .findByIdAndUpdate(
          existingQuestionResponse._id,
          { responseContent: filteredResponseContent },
          { returnOriginal: false },
        )
        .exec();

      const touchedSurveyResponse = await this._touchSurveyResponse(
        createQuestionResponseDto.surveyResponseId,
        navigatorSnapshot,
      );

      return {
        surveyResponse: touchedSurveyResponse ?? validateSurveyResponse,
        questionResponse: updatedQuestionResponse ?? existingQuestionResponse,
      };
    }

    const newQuestionResponse = await new this.questionResponseModel({
      surveyResponseId: validateSurveyResponse._id,
      questionId: createQuestionResponseDto.questionId,
      createdTime: new Date().toISOString(),
      expireCountdown: 7 * 24 * 60 * 60,
      responseContent: filteredResponseContent,
    }).save();

    const updatedSurveyResponse =
      await this._pushQuestionResponseIntoSurveyResponse(
        newQuestionResponse._id,
        createQuestionResponseDto.surveyResponseId,
        navigatorSnapshot,
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
    const textBlockIds = await this._getTextBlockQuestionIds(
      createBatchQuestionResponsesDto.responses.map(
        (response) => response.questionId,
      ),
    );

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
        uuid: randomUUID(),
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
    let latestNavigatorSnapshot: NavigatorSnapshot | undefined;

    for (const response of createBatchQuestionResponsesDto.responses) {
      const responseQuestionId =
        response.questionId?.toString?.() ?? String(response.questionId);
      if (textBlockIds.has(responseQuestionId)) {
        continue;
      }
      const normalizedContent = this._normalizeResponseContent(
        response.responseContent,
      );
      const filteredContent = await this._filterSelectionSelectionsForQuestion(
        await this._filterApprovalSelectionsForQuestion(
          await this._filterQvPlusFollowupsForQuestion(
            await this._filterQvVotesForQuestion(
              normalizedContent,
              response.questionId,
            ),
            response.questionId,
          ),
          response.questionId,
        ),
        response.questionId,
      );

      const snapshot = this._sanitizeNavigatorSnapshot(
        (response as any).navigator,
      );
      if (snapshot) {
        latestNavigatorSnapshot = snapshot;
      }

      const existingQuestionResponse =
        await this._findQuestionResponseBySurveyAndQuestion(
          surveyResponse._id,
          response.questionId,
        );

      if (existingQuestionResponse) {
        const updatedQuestionResponse = await this.questionResponseModel
          .findByIdAndUpdate(
            existingQuestionResponse._id,
            { responseContent: filteredContent },
            { returnOriginal: false },
          )
          .exec();

        createdQuestionResponses.push(
          updatedQuestionResponse ?? existingQuestionResponse,
        );
        continue;
      }

      const questionResponse = await new this.questionResponseModel({
        surveyResponseId: surveyResponse._id,
        questionId: response.questionId,
        createdTime: new Date().toISOString(),
        expireCountdown: 7 * 24 * 60 * 60,
        responseContent: filteredContent,
      }).save();

      createdQuestionResponses.push(questionResponse);
      questionResponseIds.push(questionResponse._id);
    }

    const updatedSurveyResponse = await this.surveyResponseModel
      .findByIdAndUpdate(
        surveyResponse._id,
        (() => {
          const update: any = {
            $push: { questionResponses: { $each: questionResponseIds } },
            $set: { lastUpdate: new Date().toISOString() },
          };
          if (latestNavigatorSnapshot) {
            update.$set.qvNavigator = latestNavigatorSnapshot;
          }
          return update;
        })(),
        { returnOriginal: false },
      )
      .exec();

    const baseSurveyResponse = (updatedSurveyResponse ?? surveyResponse)
      .toObject
      ? (updatedSurveyResponse ?? surveyResponse).toObject()
      : updatedSurveyResponse ?? surveyResponse;

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
        ? baseSurveyResponse.questionResponses.map(
            (qrId: any) => qrId?.toString?.() ?? qrId,
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
    const shouldSkip = await this._shouldSkipQuestionResponse(
      updateQuestionResponseDto.questionId,
    );
    if (shouldSkip) {
      return null;
    }

    const normalizedResponseContent = this._normalizeResponseContent(
      updateQuestionResponseDto.responseContent,
    );
    const filteredResponseContent =
      await this._filterSelectionSelectionsForQuestion(
        await this._filterApprovalSelectionsForQuestion(
          await this._filterQvPlusFollowupsForQuestion(
            await this._filterQvVotesForQuestion(
              normalizedResponseContent,
              updateQuestionResponseDto.questionId,
            ),
            updateQuestionResponseDto.questionId,
          ),
          updateQuestionResponseDto.questionId,
        ),
        updateQuestionResponseDto.questionId,
      );

    const navigatorSnapshot = this._sanitizeNavigatorSnapshot(
      updateQuestionResponseDto.navigator,
    );

    const updatedQuestionResponse = await this.questionResponseModel
      .findByIdAndUpdate(
        updateQuestionResponseDto.questionResponseId,
        {
          responseContent: filteredResponseContent,
        },
        { returnOriginal: false },
      )
      .exec();

    if (navigatorSnapshot) {
      await this.surveyResponseModel
        .findByIdAndUpdate(updateQuestionResponseDto.surveyResponseId, {
          $set: {
            qvNavigator: navigatorSnapshot,
            lastUpdate: new Date().toISOString(),
          },
        })
        .exec();
    }
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

    const updatedSurveyResponse =
      await this._removeQuestionResposneIdFromSurveyResponse(
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

    if (validateSurveyResponse.status === 'Complete') {
      throw new DuplicateSubmissionError();
    }

    const questionsToUpdate = validateSurveyResponse.questionResponses;

    const surveyResponse = await this.surveyResponseModel
      .findOneAndUpdate(
        {
          _id: completeSurveyResponseDto.surveyResponseId,
          status: { $ne: 'Complete' },
        },
        {
          endTime: new Date(),
          status: 'Complete',
          $unset: { expireCountdown: '' },
        },
        { returnOriginal: false, strict: false },
      )
      .exec();

    if (!surveyResponse) {
      throw new DuplicateSubmissionError();
    }

    await Promise.all(
      questionsToUpdate.map(async (questionResponseId) => {
        await this._setQuestionResponseToComplete(questionResponseId);
      }),
    );
    // for all question response, update them to remove expieration dateTime
    // push questionResponse to questionid
    // update Survey Response to complete and extend experation time
    return surveyResponse;
  }

  private _normalizeResponseContent(
    rawContent:
      | ResponseTypeQV
      | ResponseTypeLikert
      | ResponseTypeText
      | ResponseTypeApproval
      | ResponseTypeSelection,
  ):
    | ResponseTypeQV
    | ResponseTypeLikert
    | ResponseTypeText
    | ResponseTypeApproval
    | ResponseTypeSelection {
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

    if (this._isQvResponse(rawContent)) {
      const votes = Array.isArray(rawContent.votes)
        ? rawContent.votes
            .filter(
              (vote: any) =>
                vote &&
                typeof vote === 'object' &&
                typeof vote.optionId === 'string' &&
                vote.optionId.length > 0,
            )
            .map((vote: any) => ({
              optionId: vote.optionId,
              optionName:
                typeof vote.optionName === 'string' &&
                vote.optionName.length > 0
                  ? vote.optionName
                  : vote.optionId,
              group: typeof vote.group === 'string' ? vote.group : undefined,
              groupPosition:
                typeof vote.groupPosition === 'number'
                  ? vote.groupPosition
                  : undefined,
              votes: typeof vote.votes === 'number' ? vote.votes : 0,
            }))
        : [];

      const totalCredits =
        typeof rawContent.totalCredits === 'number'
          ? rawContent.totalCredits
          : undefined;

      const groupMap = this._sanitizeStringRecord((rawContent as any).group);
      const positionMap = this._sanitizeNumberRecord(
        (rawContent as any).position,
      );
      const bins = this._sanitizeBins((rawContent as any).bins);
      const categoriesOrder = this._sanitizeStringArray(
        (rawContent as any).categoriesOrder,
      );
      const navigatorSnapshot = this._sanitizeNavigatorSnapshot(
        (rawContent as any).navigator,
      );

      const normalized: any = {
        votes,
      };

      if (typeof totalCredits === 'number') {
        normalized.totalCredits = totalCredits;
      }

      if (groupMap) {
        normalized.group = groupMap;
      }

      if (positionMap) {
        normalized.position = positionMap;
      }

      if (bins) {
        normalized.bins = bins;
      }

      if (categoriesOrder && categoriesOrder.length) {
        normalized.categoriesOrder = categoriesOrder;
      }

      // QVPlus extension: preserve per-round snapshots and followup answers.
      // These fields only exist on qvplus submissions; for plain QV they're
      // absent and the conditionals below skip them.
      const rawRounds = (rawContent as any).rounds;
      if (Array.isArray(rawRounds)) {
        // Keep only well-formed round entries and project each down to the
        // expected shape so unknown client-supplied keys are dropped at
        // write-time. voteSnapshot is a nested aggregation payload whose schema
        // isn't finalized yet, so we don't deep-sanitize it here — we just
        // require a usable roundId and preserve voteSnapshot as-is when it's an
        // object. Tighten once the round schema lands.
        normalized.rounds = rawRounds
          .filter(
            (r: any) =>
              r &&
              typeof r === 'object' &&
              typeof r.roundId === 'string' &&
              r.roundId.length > 0,
          )
          .map((r: any) => ({
            roundId: r.roundId,
            voteSnapshot:
              r.voteSnapshot && typeof r.voteSnapshot === 'object'
                ? r.voteSnapshot
                : undefined,
          }));
      }
      const rawFollowupAnswers = (rawContent as any).followupAnswers;
      if (Array.isArray(rawFollowupAnswers)) {
        // Reduce each entry to the expected scalar fields and drop anything
        // missing its identifying keys (roundId/optionId/followupId).
        // choiceId may be null (option intentionally left unanswered).
        normalized.followupAnswers = rawFollowupAnswers
          .filter((a: any) => a && typeof a === 'object')
          .map((a: any) => ({
            roundId: typeof a.roundId === 'string' ? a.roundId : undefined,
            optionId: typeof a.optionId === 'string' ? a.optionId : undefined,
            followupId:
              typeof a.followupId === 'string' ? a.followupId : undefined,
            choiceId:
              typeof a.choiceId === 'string' || a.choiceId === null
                ? a.choiceId
                : null,
          }))
          .filter((a: any) => a.roundId && a.optionId && a.followupId);
      }

      if (navigatorSnapshot) {
        normalized.navigator = navigatorSnapshot;
      }

      return normalized;
    }

    if (this._isApprovalResponse(rawContent)) {
      const approvals = Array.isArray(rawContent.approvals)
        ? Array.from(
            new Set(
              rawContent.approvals.filter(
                (entry: any) => typeof entry === 'string' && entry.length > 0,
              ),
            ),
          )
        : [];

      return {
        approvals,
      };
    }

    if (this._isSelectionResponse(rawContent)) {
      const selections = Array.isArray(rawContent.selectedOptionIds)
        ? rawContent.selectedOptionIds.filter(
            (entry: any) => typeof entry === 'string' && entry.length > 0,
          )
        : [];
      const unique = Array.from(new Set(selections));
      return {
        selectedOptionIds: unique,
      };
    }

    return rawContent;
  }

  // Filters QV votes to only those belonging to the question's option set.
  // If the content is not QV or allowed options cannot be resolved, returns content unchanged.
  private async _filterQvVotesForQuestion(
    content: any,
    questionId: Types.ObjectId | string,
  ): Promise<any> {
    try {
      if (!this._isQvResponse(content)) return content;
      const qidStr =
        typeof questionId === 'string' ? questionId : questionId?.toString?.();
      if (!qidStr || !Types.ObjectId.isValid(qidStr)) return content;
      const qid = new Types.ObjectId(qidStr);
      const question: any = await this.coreService.getQuestionById(qid);
      const options: any[] = Array.isArray(question?.options)
        ? question.options
        : [];
      const allowed = new Set(
        options
          .map((o: any) =>
            o && typeof o.optionId === 'string' ? o.optionId : undefined,
          )
          .filter((x: any) => typeof x === 'string' && x.length > 0),
      );
      if (allowed.size === 0) return content;
      const votes = Array.isArray((content as any).votes)
        ? (content as any).votes
        : [];
      const filteredVotes = votes.filter((v: any) => allowed.has(v?.optionId));
      // Return shallow copy with filtered votes
      return { ...content, votes: filteredVotes };
    } catch (e) {
      // On any error, do not block submission; return original content
      return content;
    }
  }

  // QVPlus-only: drops followupAnswers whose (roundId, optionId, followupId,
  // choiceId) path does not match the question's actual definition. This keeps
  // foreign/typo'd ids out of stored responses so they can't pollute later
  // followup aggregations. Plain QV/other types have no followupAnswers and
  // return unchanged without ever hitting the DB.
  private async _filterQvPlusFollowupsForQuestion(
    content: any,
    questionId: Types.ObjectId | string,
  ): Promise<any> {
    try {
      const rawFollowups = (content as any)?.followupAnswers;
      if (!Array.isArray(rawFollowups)) return content;

      const qidStr =
        typeof questionId === 'string' ? questionId : questionId?.toString?.();
      if (!qidStr || !Types.ObjectId.isValid(qidStr)) return content;
      const qid = new Types.ObjectId(qidStr);
      const question: any = await this.coreService.getQuestionById(qid);

      // Allowed optionIds (same source the QV vote filter uses).
      const options: any[] = Array.isArray(question?.options)
        ? question.options
        : [];
      const allowedOptionIds = new Set(
        options
          .map((o: any) =>
            o && typeof o.optionId === 'string' ? o.optionId : undefined,
          )
          .filter((x: any) => typeof x === 'string' && x.length > 0),
      );

      // Nested lookup: roundId -> (followupId -> Set<choiceId>).
      const roundMap = new Map<string, Map<string, Set<string>>>();
      const rounds: any[] = Array.isArray(question?.setting?.rounds)
        ? question.setting.rounds
        : [];
      for (const r of rounds) {
        if (!r || typeof r.roundId !== 'string') continue;
        const followupMap = new Map<string, Set<string>>();
        const followups: any[] = Array.isArray(r.followupQuestions)
          ? r.followupQuestions
          : [];
        for (const fu of followups) {
          if (!fu || typeof fu.followupId !== 'string') continue;
          const choices: any[] = Array.isArray(fu.choices) ? fu.choices : [];
          const choiceIds = new Set(
            choices
              .map((c: any) =>
                c && typeof c.choiceId === 'string' ? c.choiceId : undefined,
              )
              .filter((x: any) => typeof x === 'string' && x.length > 0),
          );
          followupMap.set(fu.followupId, choiceIds);
        }
        roundMap.set(r.roundId, followupMap);
      }

      // If the question carries no resolvable structure, leave content untouched
      // rather than wiping every followup answer.
      if (allowedOptionIds.size === 0 && roundMap.size === 0) return content;

      const filteredFollowups = rawFollowups.filter((a: any) => {
        if (!a || typeof a !== 'object') return false;
        const followupMap = roundMap.get(a.roundId);
        if (!followupMap) return false; // roundId must exist on this question
        if (!allowedOptionIds.has(a.optionId)) return false; // optionId must be real
        const choiceIds = followupMap.get(a.followupId);
        if (!choiceIds) return false; // followupId must belong to that round
        // choiceId may be null (option intentionally left unanswered); otherwise
        // it must be a choice actually offered by that followup.
        if (a.choiceId === null) return true;
        return choiceIds.has(a.choiceId);
      });

      return { ...content, followupAnswers: filteredFollowups };
    } catch (e) {
      // On any error, do not block submission; return original content
      return content;
    }
  }

  private async _filterApprovalSelectionsForQuestion(
    content: any,
    questionId: Types.ObjectId | string,
  ): Promise<any> {
    try {
      if (!this._isApprovalResponse(content)) {
        return content;
      }
      const qidStr =
        typeof questionId === 'string' ? questionId : questionId?.toString?.();
      if (!qidStr || !Types.ObjectId.isValid(qidStr)) {
        return content;
      }
      const qid = new Types.ObjectId(qidStr);
      const question: any = await this.coreService.getQuestionById(qid);
      const allowedOptions: any[] = Array.isArray(question?.options)
        ? question.options
        : [];
      const allowed = new Set(
        allowedOptions
          .map((opt: any) =>
            typeof opt?.optionId === 'string' ? opt.optionId : undefined,
          )
          .filter((id: any) => typeof id === 'string' && id.length > 0),
      );
      if (!allowed.size) {
        return { ...content, approvals: [] };
      }
      const unique: string[] = [];
      (content.approvals ?? []).forEach((entry: any) => {
        if (
          typeof entry === 'string' &&
          allowed.has(entry) &&
          !unique.includes(entry)
        ) {
          unique.push(entry);
        }
      });
      const effectiveLimit = resolveEffectiveApprovalLimit({
        optionCount: allowed.size,
        maxApprovals: question?.maxApprovals,
        unlimitedApprovals: question?.unlimitedApprovals,
      });
      if (
        typeof effectiveLimit === 'number' &&
        unique.length > effectiveLimit
      ) {
        throw new BadRequestException(
          `Too many approvals selected. Maximum allowed is ${effectiveLimit} [URS0609]`,
        );
      }
      return { ...content, approvals: unique };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      return content;
    }
  }

  private async _filterSelectionSelectionsForQuestion(
    content: any,
    questionId: Types.ObjectId | string,
  ): Promise<any> {
    try {
      if (!this._isSelectionResponse(content)) {
        return content;
      }
      const qidStr =
        typeof questionId === 'string' ? questionId : questionId?.toString?.();
      if (!qidStr || !Types.ObjectId.isValid(qidStr)) {
        return content;
      }
      const qid = new Types.ObjectId(qidStr);
      const question: any = await this.coreService.getQuestionById(qid);
      if (!question) {
        throw new BadRequestException('Question not found [URS0610]');
      }

      const optionList: any[] = Array.isArray(question?.options)
        ? question.options
        : [];
      const allowed = new Set(
        optionList
          .map((opt: any) =>
            typeof opt?.optionId === 'string' ? opt.optionId : undefined,
          )
          .filter((id: any) => typeof id === 'string' && id.length > 0),
      );

      const exclusives = new Set(
        optionList
          .filter((opt: any) => opt?.isExclusive === true)
          .map((opt: any) =>
            typeof opt?.optionId === 'string' ? opt.optionId : undefined,
          )
          .filter((id: any) => typeof id === 'string' && id.length > 0),
      );

      const incoming = Array.isArray(content.selectedOptionIds)
        ? content.selectedOptionIds
        : [];
      const unique: string[] = [];
      const seen = new Set<string>();
      incoming.forEach((entry: any) => {
        if (
          typeof entry === 'string' &&
          entry.length > 0 &&
          allowed.has(entry) &&
          !seen.has(entry)
        ) {
          seen.add(entry);
          unique.push(entry);
        }
      });

      const selectionMode =
        question?.selectionMode === 'multi' ? 'multi' : 'single';
      const required = Boolean(question?.required);
      const minSelections =
        typeof question?.minSelections === 'number'
          ? question.minSelections
          : undefined;
      const maxSelections =
        typeof question?.maxSelections === 'number'
          ? question.maxSelections
          : undefined;

      const exclusiveSelection = unique.find((id) => exclusives.has(id));
      const filteredSelections =
        selectionMode === 'multi' && exclusiveSelection
          ? [exclusiveSelection]
          : unique;

      if (selectionMode === 'single') {
        if (filteredSelections.length > 1) {
          throw new BadRequestException(
            'Too many selections for single-select question [URS0611]',
          );
        }
        if (required && filteredSelections.length === 0) {
          throw new BadRequestException(
            'Selection required for this question [URS0612]',
          );
        }
      } else {
        if (!exclusiveSelection) {
          if (required && filteredSelections.length === 0) {
            throw new BadRequestException(
              'Selection required for this question [URS0613]',
            );
          }
          if (
            typeof minSelections === 'number' &&
            filteredSelections.length < minSelections
          ) {
            throw new BadRequestException(
              'Minimum selections not met [URS0614]',
            );
          }
          if (
            typeof maxSelections === 'number' &&
            filteredSelections.length > maxSelections
          ) {
            throw new BadRequestException(
              'Maximum selections exceeded [URS0615]',
            );
          }
        }
      }

      return { ...content, selectedOptionIds: filteredSelections };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to validate selection response [URS0616]',
      );
    }
  }

  private _isLikertResponse(content: any): content is ResponseTypeLikert {
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

  private _isQvResponse(content: any): content is ResponseTypeQV {
    return (
      content && typeof content === 'object' && Array.isArray(content.votes)
    );
  }

  private _isApprovalResponse(content: any): content is ResponseTypeApproval {
    return (
      content &&
      typeof content === 'object' &&
      Array.isArray((content as any).approvals)
    );
  }

  private _isSelectionResponse(content: any): content is ResponseTypeSelection {
    return (
      content &&
      typeof content === 'object' &&
      Array.isArray((content as any).selectedOptionIds)
    );
  }

  private _sanitizeStringRecord(
    value: any,
  ): Record<string, string> | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const entries = Object.entries(value).filter(
      ([key, val]) =>
        typeof key === 'string' &&
        key.length > 0 &&
        typeof val === 'string' &&
        val.length > 0,
    );
    if (!entries.length) return undefined;
    const result: Record<string, string> = {};
    entries.forEach(([key, val]) => {
      result[key] = val as string;
    });
    return result;
  }

  private _sanitizeNumberRecord(
    value: any,
  ): Record<string, number> | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const entries = Object.entries(value).filter(
      ([key, val]) =>
        typeof key === 'string' &&
        key.length > 0 &&
        typeof val === 'number' &&
        Number.isFinite(val),
    );
    if (!entries.length) return undefined;
    const result: Record<string, number> = {};
    entries.forEach(([key, val]) => {
      result[key] = val as number;
    });
    return result;
  }

  private _sanitizeBins(
    value: any,
  ):
    | { hasUndecided?: boolean; hasSkip?: boolean; userDefined?: string[] }
    | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const bins: any = {};
    if (typeof value.hasUndecided === 'boolean') {
      bins.hasUndecided = value.hasUndecided;
    }
    if (typeof value.hasSkip === 'boolean') {
      bins.hasSkip = value.hasSkip;
    }
    if (Array.isArray(value.userDefined)) {
      const sanitized = value.userDefined.filter(
        (entry: any) => typeof entry === 'string' && entry.length > 0,
      );
      if (sanitized.length) {
        bins.userDefined = Array.from(new Set(sanitized));
      }
    }
    return Object.keys(bins).length ? bins : undefined;
  }

  private _sanitizeStringArray(value: any): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const sanitized = value.filter(
      (entry: any) => typeof entry === 'string' && entry.length > 0,
    );
    if (!sanitized.length) return undefined;
    const seen = new Set<string>();
    const deduped: string[] = [];
    sanitized.forEach((item) => {
      if (!seen.has(item)) {
        seen.add(item);
        deduped.push(item);
      }
    });
    return deduped;
  }

  private _sanitizeNavigatorSnapshot(raw: any): NavigatorSnapshot | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const order = this._sanitizeStringArray(raw.order);
    if (!order || !order.length) return undefined;

    const snapshot: NavigatorSnapshot = { order };

    if (
      typeof raw.activeQuestionId === 'string' &&
      raw.activeQuestionId.length > 0
    ) {
      snapshot.activeQuestionId = raw.activeQuestionId;
    }

    let completedArray: string[] | undefined;
    if (Array.isArray(raw.completed)) {
      completedArray = this._sanitizeStringArray(raw.completed);
    } else if (raw.completed && typeof raw.completed === 'object') {
      const entries = Object.entries(raw.completed).filter(([, val]) =>
        Boolean(val),
      );
      if (entries.length) {
        const seen = new Set<string>();
        completedArray = [];
        entries.forEach(([key]) => {
          if (typeof key === 'string' && key.length > 0 && !seen.has(key)) {
            seen.add(key);
            completedArray!.push(key);
          }
        });
      }
    }

    if (completedArray && completedArray.length) {
      snapshot.completed = completedArray;
    }

    return snapshot;
  }

  private async _shouldSkipQuestionResponse(
    questionId: Types.ObjectId,
  ): Promise<boolean> {
    const question = await this.coreService.getQuestionById(questionId);
    if (!question) {
      throw new BadRequestException('Question not found [URS0602]');
    }
    const questionType = detectQuestionType(question);
    return questionType === 'text_block';
  }

  private async _getTextBlockQuestionIds(
    questionIds: Types.ObjectId[],
  ): Promise<Set<string>> {
    const questionDocs = await this.coreService.getQuestionsByManyIds(
      questionIds,
    );
    const textBlockIds = new Set<string>();
    questionDocs.forEach((doc) => {
      const questionType = detectQuestionType(doc);
      if (questionType !== 'text_block') {
        return;
      }
      const id = doc?._id?.toString?.() ?? '';
      if (id) {
        textBlockIds.add(id);
      }
    });
    return textBlockIds;
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

  private async _resolveCompletedParticipantResultsContext(
    uuid: string,
    surveyId: string,
    messages: CompletedParticipantResultsContextMessages = DEFAULT_COMPLETED_RESULTS_CONTEXT_MESSAGES,
  ): Promise<CompletedParticipantResultsContext> {
    const surveyResponse = await this.coreService.getSurveyResponseByUUID(
      uuid,
    );
    if (!surveyResponse) {
      throw new BadRequestException(messages.responseNotFound);
    }

    this._ensureSurveyAssociation(surveyResponse, surveyId);

    if (surveyResponse.status !== 'Complete') {
      throw new BadRequestException(messages.responseIncomplete);
    }

    const surveyObjectId = new Types.ObjectId(surveyId);
    const survey = await this.coreService.getSurveyById(surveyObjectId);
    if (!survey) {
      throw new BadRequestException(messages.surveyNotFound);
    }

    this._validateParticipantSurveyResultsEnabled(survey);

    const questionResponseIds = Array.isArray(surveyResponse.questionResponses)
      ? surveyResponse.questionResponses
      : [];
    const questionResponses = questionResponseIds.length
      ? await this.coreService.getQuestionResponsesByManyIds(
          questionResponseIds,
        )
      : [];
    const answeredQuestionIds = new Set<string>();
    (questionResponses ?? []).forEach((questionResponse: any) => {
      const questionId = questionResponse?.questionId?.toString?.();
      if (questionId) {
        answeredQuestionIds.add(questionId);
      }
    });

    return {
      surveyResponse,
      survey,
      questionResponses,
      answeredQuestionIds,
      sKey: surveyResponse.sKey,
      uKey: surveyResponse.uKey,
    };
  }

  private _validateParticipantSurveyResultsEnabled(survey: any) {
    if (survey?.settings?.respondentsCanViewResults === false) {
      throw new ForbiddenException(
        'Participant results are not enabled for this survey [URS0561]',
      );
    }
  }

  private _isParticipantResultsSupportedQuestion(question: any) {
    const type = detectQuestionType(question);
    return PARTICIPANT_RESULTS_SUPPORTED_TYPES.has(type);
  }

  private _isParticipantQuestionResultsEnabled(question: any) {
    if (!this._isParticipantResultsSupportedQuestion(question)) {
      return false;
    }
    return question?.respondentResultsEnabled !== false;
  }

  private async _validateParticipantQuestionResultsEnabled(
    survey: any,
    questionId: string,
    answeredQuestionIds?: Set<string>,
  ) {
    if (!Types.ObjectId.isValid(questionId)) {
      throw new BadRequestException('questionId is invalid [URS0560]');
    }

    const questionObjectId = new Types.ObjectId(questionId);
    const questionIdString = questionObjectId.toString();
    const questionBelongsToSurvey = Array.isArray(survey?.questions)
      ? survey.questions.some(
          (id: any) =>
            (id?._id?.toString?.() ?? id?.toString?.()) === questionIdString,
        )
      : false;

    if (!questionBelongsToSurvey) {
      throw new ForbiddenException(
        'Participant results are not enabled for this question [URS0562]',
      );
    }

    if (answeredQuestionIds && !answeredQuestionIds.has(questionIdString)) {
      throw new ForbiddenException(
        'Participant results are not enabled for this question [URS0562]',
      );
    }

    const question = await this.coreService.getQuestionById(questionObjectId);
    if (!question || !this._isParticipantQuestionResultsEnabled(question)) {
      throw new ForbiddenException(
        'Participant results are not enabled for this question [URS0562]',
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

  private async _findQuestionResponseBySurveyAndQuestion(
    surveyResponseId: Types.ObjectId,
    questionId: Types.ObjectId,
  ) {
    return this.questionResponseModel
      .findOne({ surveyResponseId, questionId })
      .exec();
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
    navigatorSnapshot?: NavigatorSnapshot,
  ) {
    const update: any = {
      $push: { questionResponses: questionResponseId },
      $set: { lastUpdate: new Date().toISOString() },
    };

    if (navigatorSnapshot) {
      update.$set.qvNavigator = navigatorSnapshot;
    }

    return this.surveyResponseModel
      .findByIdAndUpdate(surveyResponseId, update, {
        returnOriginal: false,
      })
      .exec();
  }

  private async _touchSurveyResponse(
    surveyResponseId: Types.ObjectId,
    navigatorSnapshot?: NavigatorSnapshot,
  ) {
    const update: any = {
      $set: { lastUpdate: new Date().toISOString() },
    };

    if (navigatorSnapshot) {
      update.$set.qvNavigator = navigatorSnapshot;
    }

    return this.surveyResponseModel
      .findByIdAndUpdate(surveyResponseId, update, {
        returnOriginal: false,
      })
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
