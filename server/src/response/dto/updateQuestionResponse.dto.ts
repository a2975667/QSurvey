import {
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  Length,
} from 'class-validator';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { ResponseTypeLikert } from './likert-response.dto';
import { QvNavigatorDto, ResponseTypeQV } from './qv-response.dto';
import { ResponseTypeText } from './text-response.dto';

export class UpdateQuestionResponseDto {
  @IsUUID()
  @IsNotEmpty()
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

  @IsNotEmpty()
  @ValidateNested()
  responseContent: ResponseTypeQV | ResponseTypeLikert | ResponseTypeText;

  @IsOptional()
  @ValidateNested()
  @Type(() => QvNavigatorDto)
  navigator?: QvNavigatorDto;
}
