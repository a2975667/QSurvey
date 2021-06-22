import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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

export class QVOption {
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateUpdateQVQuestionDto {
  @IsNotEmpty()
  surveyId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^qv$/)
  type: string;

  @IsString()
  description: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @Type(() => QVSettings)
  @IsNotEmpty()
  @ValidateNested()
  setting: QVSettings;

  @Type(() => QVOption)
  @IsNotEmpty()
  @ValidateNested()
  options: QVOption[];

  @IsOptional()
  @IsNumber()
  insertPosition: number;
}
