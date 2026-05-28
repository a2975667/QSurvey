import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import {
  QVPlusQuestion,
  QVPlusQuestionDocument,
} from 'src/schemas/questions/qvplus/qvplus-question.schema';
import { debugLog, debugLogLazy } from 'src/config/runtime-flags';
import { CreateUpdateQVPlusQuestionDto } from '../dtos/createQVPlusQuestion.dto';
import { SurveysService } from '../../surveys/surveys.service';

@Injectable()
export class QvPlusService {
  constructor(
    @InjectModel(QVPlusQuestion.name)
    private QVPlusQuestionModel: Model<QVPlusQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createQVPlusQuestion(
    userId: Types.ObjectId,
    createQVPlusQuestionDto: CreateUpdateQVPlusQuestionDto,
  ): Promise<QVPlusQuestion> {
    const { insertPosition, surveyId, ...createQuestion } =
      createQVPlusQuestionDto;
    debugLog('[DEBUG][QVPlus] createQVPlusQuestion payload showInstructions:', {
      surveyId: surveyId?.toString?.(),
      showInstructions: createQuestion?.setting?.showInstructions,
    });

    // 1. Validate user + survey + ownership.
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    // 2. Backfill optionIds (re-use QV's helper — QVPlus options share the QV shape).
    createQuestion.options = this.coreLogicService.fixQVOptionID(
      createQuestion.options,
    );

    // 3. Build + persist the new QVPlus question document.
    debugLogLazy(() => [
      '[DEBUG] Creating new QVPlus question with data:',
      JSON.stringify(createQuestion),
    ]);
    const createdQVPlusQuestion = new this.QVPlusQuestionModel(createQuestion);
    const createdQuestion = await createdQVPlusQuestion.save();
    debugLog(
      '[DEBUG] QVPlus question saved with ID:',
      createdQuestion._id.toString(),
    );

    // 4. Decide where to insert in the survey's questions array.
    const currQuestionLength = survey.questions ? survey.questions.length : 0;
    let insertIndex: number;
    if (survey.questions === undefined || currQuestionLength === 0) {
      survey.questions = [];
      insertIndex = 0;
    } else if (
      insertPosition === undefined ||
      insertPosition > currQuestionLength
    ) {
      insertIndex = currQuestionLength;
    } else {
      insertIndex = insertPosition - 1;
    }

    // 5. Normalize existing IDs to real ObjectIds (mirrors QV — see SSQ001 in CLAUDE.md).
    const questionIdToAdd =
      createdQuestion._id instanceof Types.ObjectId
        ? createdQuestion._id
        : new Types.ObjectId(createdQuestion._id.toString());

    const updatedQuestions = Array.isArray(survey.questions)
      ? [
          ...survey.questions.map((id) => {
            if (id instanceof Types.ObjectId) {
              return id;
            } else if (typeof id === 'string') {
              return new Types.ObjectId(id);
            } else if (id && typeof id === 'object') {
              // @ts-ignore - mongoose may give us a hydrated subdoc here.
              return new Types.ObjectId(id.toString());
            }
            console.warn('Unexpected ID type in survey.questions');
            return new Types.ObjectId();
          }),
        ]
      : [];

    updatedQuestions.splice(insertIndex, 0, questionIdToAdd);
    debugLog(
      '[DEBUG] Inserting QVPlus question ID',
      questionIdToAdd.toString(),
      'at position',
      insertIndex,
    );

    // 6. Persist the updated survey.questions array.
    //    IMPORTANT: pass a plain object, not plainToClass — see SSQ001 invariant.
    await this.surveysService.updateSurveyQuestionsById(userId, surveyId, {
      questions: updatedQuestions,
    });

    return createdQuestion;
  }

  async updateQVPlusQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVPlusQuestionDto: CreateUpdateQVPlusQuestionDto,
  ): Promise<QVPlusQuestion> {
    const { surveyId, ...updateQuestion } = updateQVPlusQuestionDto;
    if (updateQuestion.insertPosition) delete updateQuestion.insertPosition;

    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    updateQuestion.options = this.coreLogicService.fixQVOptionID(
      updateQuestion.options,
    );

    const updatedQuestion = await this.QVPlusQuestionModel.findByIdAndUpdate(
      questionId,
      updateQuestion,
      { returnOriginal: false },
    ).exec();

    if (updatedQuestion) {
      return updatedQuestion;
    }
    throw new BadRequestException('Cannot Update Question. [QSPLUS0122]');
  }
}
