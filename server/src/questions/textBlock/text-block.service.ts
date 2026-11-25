import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TextBlockQuestion,
  TextBlockQuestionDocument,
} from 'src/schemas/questions/textBlock/text-block.question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { CreateTextBlockQuestionDto } from '../dtos/createTextBlockQuestion.dto';
import { UpdateTextBlockQuestionDto } from '../dtos/updateTextBlockQuestion.dto';
import { debugLogLazy } from 'src/config/runtime-flags';

@Injectable()
export class TextBlockService {
  constructor(
    @InjectModel(TextBlockQuestion.name)
    private textBlockModel: Model<TextBlockQuestionDocument>,
    private surveysService: SurveysService,
  ) {}

  async createTextBlockQuestion(
    userId: Types.ObjectId,
    createTextBlockQuestionDto: CreateTextBlockQuestionDto,
  ) {
    const surveyId = createTextBlockQuestionDto.surveyId;

    debugLogLazy(() => [
      'Creating Text Block question with data:',
      JSON.stringify(createTextBlockQuestionDto),
    ]);

    const createdTextBlockQuestion = new this.textBlockModel({
      ...createTextBlockQuestionDto,
      type: 'text_block',
      newPage: createTextBlockQuestionDto.newPage ?? false,
    });
    return this.surveysService.saveNewSurveyQuestion(userId, surveyId, createdTextBlockQuestion);
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

    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');

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
      { new: true, projection: { responses: 0 } },
    );

    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [TB0003]');
    }

    return updatedQuestion;
  }
}
