import { Type } from 'class-transformer';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { SurveySettings } from './createSurvey.dto';

export class UpdateSurveyDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @Type(() => SurveySettings)
  @ValidateNested()
  @IsOptional()
  settings: SurveySettings;
}
