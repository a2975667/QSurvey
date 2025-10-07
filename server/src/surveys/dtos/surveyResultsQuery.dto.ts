import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class SurveyResultsQueryDto {
  @IsMongoId({ message: 'questionId must be a valid ObjectId' })
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  status?: string;

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
