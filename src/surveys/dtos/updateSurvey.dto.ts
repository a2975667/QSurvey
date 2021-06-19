import { IsString, IsOptional, IsBoolean, ValidateIf } from 'class-validator';

export class SurveySettings {
  @IsBoolean() required: true;
  SKey: boolean;

  @ValidateIf((o) => o.SKey === true)
  @IsString()
  SKeyValue: string;

  @IsBoolean()
  UKey: boolean;
}

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
