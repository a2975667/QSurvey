import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Matches, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

export class QVBinLabelOverrides {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  Positive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Neutral?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Negative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Undecided?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Skip?: string;
}

export class QVLabelOverrides {
  @IsOptional()
  @ValidateNested()
  @Type(() => QVBinLabelOverrides)
  binLabels?: QVBinLabelOverrides;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  votePositive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voteNegative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voteNone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sortByVotes?: string;
}

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
