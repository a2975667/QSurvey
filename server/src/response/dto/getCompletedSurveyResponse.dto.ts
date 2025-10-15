import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetCompletedSurveyResponseQueryDto {
  @IsMongoId({ message: 'surveyId must be a valid ObjectId' })
  surveyId: string;

  @IsOptional()
  @IsString()
  sKey?: string;

  @IsOptional()
  @Length(1)
  @IsString()
  uKey?: string;
}

export class GetSurveyResponseUuidParamDto {
  @IsUUID()
  uuid: string;
}

export class GetCompletedSurveyResultsQueryDto extends GetCompletedSurveyResponseQueryDto {
  @IsMongoId({ message: 'questionId must be a valid ObjectId' })
  questionId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
