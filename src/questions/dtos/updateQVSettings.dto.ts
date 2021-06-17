import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Matches, ValidateNested } from 'class-validator';
export class QVSettings {
  @IsNumber()
  @IsNotEmpty()
  totalCredits: number;

  @IsNumber()
  @IsNotEmpty()
  version: number;

  @IsString()
  @IsNotEmpty()
  @Matches('qv')
  questionType: string;
}

export class UpdateQVSettingsDto {
  @IsNotEmpty()
  surveyId: string;

  @Type(() => QVSettings)
  @IsNotEmpty()
  @ValidateNested()
  setting: QVSettings;
}
