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
  SKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  UKey: string;

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
