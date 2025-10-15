import {
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class GetUserSurveyResponseDTO {
  @IsUUID()
  uuid: string;

  @IsMongoId({ message: 'surveyId must be a valid ObjectId' })
  surveyId: string;

  @IsOptional()
  @IsString()
  sKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  uKey: string;
}
