import { IsBoolean, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class SurveySettings {
  @IsBoolean() required: true;
  SKey: boolean;

  @ValidateIf((o) => o.SKey === true)
  @IsString()
  SKeyValue: string;

  @IsBoolean()
  UKey: boolean;
}

export class CreateSurveyDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNotEmpty()
  settings: SurveySettings;
}
