import {
  Equals,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  IsNotEmpty,
  ValidateNested,
  Length,
} from 'class-validator';
import { Types } from 'mongoose';
import { ResponseTypeLikert } from './likert-response.dto';
import { ResponseTypeQV } from './qv-response.dto';

export class CreateQuestionResponseDto {
  @IsUUID()
  @IsOptional()
  uuid: string;

  @ValidateIf((o) => o.uuid !== undefined)
  @IsNotEmpty()
  surveyResponseId: Types.ObjectId;

  @ValidateIf((o) => o.uuid === undefined)
  @IsNotEmpty()
  @Equals(true)
  IsNewSurveyResponse: boolean;

  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  questionId: Types.ObjectId;

  @IsNotEmpty()
  @ValidateNested()
  responseContent: ResponseTypeQV | ResponseTypeLikert;

  @IsOptional()
  @IsString()
  SKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  UKey: string;
}
