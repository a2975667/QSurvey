import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ValidateIf, ValidateNested } from 'class-validator';

export class SurveySettings {
  @IsBoolean()
  @IsNotEmpty()
  hasSKey: boolean;

  @ValidateIf((o) => o.hasSKey === true)
  @IsString()
  @IsNotEmpty()
  sKeyValue: string;

  @IsBoolean()
  @IsNotEmpty()
  hasUKey: boolean;

  @IsBoolean()
  @IsNotEmpty()
  isAvailable: boolean;

  @IsBoolean()
  @IsOptional()
  respondentsCanViewResults?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['en-US', 'zh-TW'])
  locale?: string;
}

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @Type(() => SurveySettings)
  @IsNotEmpty()
  @ValidateNested()
  settings: SurveySettings;
}
