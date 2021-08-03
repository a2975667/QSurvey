import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
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
  isAvaliable: boolean;
}

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => SurveySettings)
  @IsNotEmpty()
  @ValidateNested()
  settings: SurveySettings;
}
