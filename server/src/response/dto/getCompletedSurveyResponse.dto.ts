import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetCompletedSurveyResponseQueryDto {
  @IsMongoId({ message: 'surveyId must be a valid ObjectId' })
  surveyId: string;
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
