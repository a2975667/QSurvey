import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SurveyExportQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  asOf?: string;
}
