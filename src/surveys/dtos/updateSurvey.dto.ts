import { IsString, IsOptional } from 'class-validator';
import { SurveySettings } from './createSurvey.dto';

export class UpdateSurveyDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsOptional()
  settings: SurveySettings;
}
