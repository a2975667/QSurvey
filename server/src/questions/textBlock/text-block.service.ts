import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import {
  TextBlockQuestion,
  TextBlockQuestionDocument,
} from 'src/schemas/questions/textBlock/text-block.question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { CreateTextBlockQuestionDto } from '../dtos/createTextBlockQuestion.dto';
import { UpdateTextBlockQuestionDto } from '../dtos/updateTextBlockQuestion.dto';
import { debugLogLazy } from 'src/config/runtime-flags';

@Injectable()
export class TextBlockService {
  constructor(
    @InjectModel(TextBlockQuestion.name)
    private textBlockModel: Model<TextBlockQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createTextBlockQuestion(
    userId: Types.ObjectId,
    createTextBlockQuestionDto: CreateTextBlockQuestionDto,
  ) {
    const user = await this.coreService.getUserById(userId);
    const surveyId = createTextBlockQuestionDto.surveyId;
    const survey = await this.coreService.getSurveyById(surveyId);

    this.coreLogicService.validateSurveyOwnership(user, survey);

    debugLogLazy(() => [
      'Creating Text Block question with data:',
      JSON.stringify(createTextBlockQuestionDto),
    ]);

    const createdTextBlockQuestion = new this.textBlockModel({
      ...createTextBlockQuestionDto,
      type: 'text_block',
      newPage: createTextBlockQuestionDto.newPage ?? false,
    });

    const savedQuestion = await createdTextBlockQuestion.save();

    const currentQuestions = Array.isArray(survey.questions)
      ? survey.questions
      : [];
    const currentQuestionIds = currentQuestions.map((q: any) =>
      q && typeof q.toString === 'function' ? q.toString() : String(q),
    );

    const updatedQuestionIds = [
      ...currentQuestionIds.map((id) => new Types.ObjectId(id)),
      savedQuestion._id as Types.ObjectId,
    ];

    await this.surveysService.updateSurveyQuestionsById(userId, surveyId, {
      questions: updatedQuestionIds,
    } as UpdateSurveyQuestionsDto);

    return savedQuestion;
  }

  async updateTextBlockQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateTextBlockQuestionDto: UpdateTextBlockQuestionDto,
  ) {
    const surveyId = updateTextBlockQuestionDto.surveyId;
    if (!surveyId) {
      throw new BadRequestException('surveyId is required [TB0001]');
    }

    const user = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);

    this.coreLogicService.validateSurveyOwnership(user, survey);

    const questionBelongsToSurvey = Array.isArray(survey.questions)
      ? survey.questions.some((q) => q.toString() === questionId.toString())
      : false;

    if (!questionBelongsToSurvey) {
      throw new BadRequestException(
        'Question does not belong to the specified survey [TB0002]',
      );
    }

    const updatePayload: Partial<TextBlockQuestion> = {
      type: 'text_block',
    };

    if (updateTextBlockQuestionDto.content !== undefined) {
      updatePayload.content = updateTextBlockQuestionDto.content;
    }

    if (updateTextBlockQuestionDto.newPage !== undefined) {
      updatePayload.newPage = updateTextBlockQuestionDto.newPage;
    }

    if (updateTextBlockQuestionDto.respondentResultsEnabled !== undefined) {
      updatePayload.respondentResultsEnabled =
        updateTextBlockQuestionDto.respondentResultsEnabled === true;
    }

    const updatedQuestion = await this.textBlockModel.findByIdAndUpdate(
      questionId,
      updatePayload,
      { new: true },
    );

    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [TB0003]');
    }

    return updatedQuestion;
  }
}
