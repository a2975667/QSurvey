import {
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  Length,
} from 'class-validator';
import { Types } from 'mongoose';

export class RemoveQuestionResponseDto {
  @IsUUID()
  @IsOptional()
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
  questionResponseId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  questionId: Types.ObjectId;
}
