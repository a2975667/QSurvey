import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class SurveyIdDto {
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;
}
