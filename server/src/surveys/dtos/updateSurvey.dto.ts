import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, IsOptional, ValidateNested } from 'class-validator';
import { SurveySettings } from './createSurvey.dto';

export class UpdateSurveyDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsBoolean()
  @IsOptional()
  isPinned: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags: string[];

  @Type(() => SurveySettings)
  @ValidateNested()
  @IsOptional()
  settings: SurveySettings;
}
