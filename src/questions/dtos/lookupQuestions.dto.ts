import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class CreateQuestionsDto {
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;
}
