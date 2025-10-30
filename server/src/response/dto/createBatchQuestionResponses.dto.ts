import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  Length,
} from 'class-validator';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { ResponseTypeLikert } from './likert-response.dto';
import { ResponseTypeQV } from './qv-response.dto';
import { ResponseTypeText } from './text-response.dto';

export class BatchQuestionResponseDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: Types.ObjectId;

  @ValidateNested()
  responseContent: ResponseTypeQV | ResponseTypeLikert | ResponseTypeText;
}

export class CreateBatchQuestionResponsesDto {
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchQuestionResponseDto)
  responses: BatchQuestionResponseDto[];

  @IsOptional()
  @IsString()
  sKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  uKey: string;

  @IsOptional()
  @IsUUID()
  uuid?: string;

  @IsOptional()
  @IsMongoId()
  surveyResponseId?: Types.ObjectId;
}

