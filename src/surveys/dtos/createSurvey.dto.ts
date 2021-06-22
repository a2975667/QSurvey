import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { ValidateIf, ValidateNested } from 'class-validator';

export class SurveySettings {
  @IsBoolean()
  @IsNotEmpty()
  HasSKey: boolean;

  @ValidateIf((o) => o.HasSKey === true)
  @IsString()
  @IsNotEmpty()
  SKeyValue: string;

  @IsBoolean()
  @IsNotEmpty()
  HasUKey: boolean;

  @IsBoolean()
  @IsNotEmpty()
  IsAvaliable: boolean;
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
