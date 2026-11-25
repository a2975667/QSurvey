import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
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

    createQuestion.options = this.coreLogicService.fixQVOptionID(
      createQuestion.options,
    );

    debugLogLazy(() => [
      '[DEBUG] Creating new QVPlus question with data:',
      JSON.stringify(createQuestion),
    ]);
    const createdQVPlusQuestion = new this.QVPlusQuestionModel(createQuestion);
    return this.surveysService.saveNewSurveyQuestion(userId, surveyId, createdQVPlusQuestion, insertPosition);
  }

  async updateQVPlusQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateQVPlusQuestionDto: CreateUpdateQVPlusQuestionDto,
  ): Promise<QVPlusQuestion> {
    const { surveyId, ...updateQuestion } = updateQVPlusQuestionDto;

    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');

    updateQuestion.options = this.coreLogicService.fixQVOptionID(
      updateQuestion.options,
    );

    const updatedQuestion = await this.QVPlusQuestionModel.findByIdAndUpdate(
      questionId,
      { $set: {
        type: updateQuestion.type,
        question: updateQuestion.question,
        description: updateQuestion.description,
        setting: updateQuestion.setting,
        options: updateQuestion.options,
        respondentResultsEnabled: updateQuestion.respondentResultsEnabled,
      } },
      { new: true, projection: { responses: 0 } },
    ).exec();

    if (updatedQuestion) {
      return updatedQuestion;
    }
    throw new BadRequestException('Cannot Update Question. [QSPLUS0122]');
  }
}
