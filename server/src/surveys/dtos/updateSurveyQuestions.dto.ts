import { IsArray, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateSurveyQuestionsDto {
  @IsArray()
  @IsMongoId({ each: true })
  questions: Types.ObjectId[];
}
