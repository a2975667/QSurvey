import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class DeleteQuestionsDto {
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;
}
