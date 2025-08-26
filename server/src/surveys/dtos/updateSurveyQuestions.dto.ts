import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateSurveyQuestionsDto {
  @IsMongoId()
  questions: Types.ObjectId[];
}
