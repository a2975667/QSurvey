import {
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  Length,
} from 'class-validator';
import { Types } from 'mongoose';

export class CompleteSurveyResponseDto {
  @IsUUID()
  uuid: string;

  @IsOptional()
  @IsString()
  sKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  uKey: string;

  @IsMongoId()
  @IsNotEmpty()
  surveyResponseId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;
}
