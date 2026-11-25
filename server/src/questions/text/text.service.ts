import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TextInputQuestion, TextInputQuestionDocument } from 'src/schemas/questions/textInput/text-input.question.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { CreateTextQuestionDto } from '../dtos/createTextQuestion.dto';
import { UpdateTextQuestionDto } from '../dtos/updateTextQuestion.dto';
import { debugLog, debugLogLazy } from 'src/config/runtime-flags';

@Injectable()
export class TextService {
  constructor(
    @InjectModel(TextInputQuestion.name)
    private textModel: Model<TextInputQuestionDocument>,
    private surveysService: SurveysService,
  ) {}

  async createTextQuestion(
    userId: Types.ObjectId,
    createTextQuestionDto: CreateTextQuestionDto,
  ) {
    const surveyId = createTextQuestionDto.surveyId;

    debugLogLazy(() => [
      'Creating Text question with data:',
      JSON.stringify(createTextQuestionDto),
    ]);

    // Convert groupId to ObjectId if it's a string
    let groupId = undefined;
    if (createTextQuestionDto.groupId) {
      try {
        groupId = new Types.ObjectId(createTextQuestionDto.groupId);
      } catch (e) {
        console.warn('Invalid groupId format');
      }
    }

    // Create the Text question using the specialized model
    // Let Mongoose handle the _id field automatically
    const createdTextQuestion = new this.textModel({
      ...createTextQuestionDto,
      type: 'text',
      groupId
    });
    return this.surveysService.saveNewSurveyQuestion(userId, surveyId, createdTextQuestion);
  }

  async updateTextQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateTextQuestionDto: UpdateTextQuestionDto,
  ) {
    const surveyId = updateTextQuestionDto.surveyId;
    await this.surveysService.authorizeSurveyQuestion(userId, surveyId, questionId, 'edit');
    
    // Convert groupId to ObjectId if it's a string
    let groupId = undefined;
    if (updateTextQuestionDto.groupId) {
      try {
        groupId = new Types.ObjectId(updateTextQuestionDto.groupId);
      } catch (e) {
        console.warn('Invalid groupId format');
      }
    }
    
    // Update the Text question using the specialized model
    const updatedQuestion = await this.textModel.findByIdAndUpdate(
      questionId,
      { 
        question: updateTextQuestionDto.question,
        description: updateTextQuestionDto.description,
        respondentResultsEnabled: updateTextQuestionDto.respondentResultsEnabled,
        multiline: updateTextQuestionDto.multiline,
        maxLength: updateTextQuestionDto.maxLength,
        type: 'text',
        groupId
      },
      { new: true, projection: { responses: 0 } },
    );
    
    if (!updatedQuestion) {
      throw new BadRequestException('Question not found [TS0002]');
    }
    
    return updatedQuestion;
  }
}
