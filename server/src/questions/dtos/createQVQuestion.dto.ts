import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Matches, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { QVLabelOverrides } from './qvLabelOverrides.dto';

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

  @IsNumber()
  sampleOption: number;

  @IsOptional()
  @IsBoolean()
  showInstructions?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QVLabelOverrides)
  labelOverrides?: QVLabelOverrides;
}

export class QVOption {
  @IsString()
  @IsOptional()
  optionId: string;

  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateUpdateQVQuestionDto {
  @IsNotEmpty()
  surveyId: Types.ObjectId;

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
  @IsBoolean()
  respondentResultsEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  insertPosition: number;
}
