import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
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
  @Matches(/^qv$/)
  questionType: string;

  @IsOptional()
  @IsBoolean()
  showInstructions?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QVLabelOverrides)
  labelOverrides?: QVLabelOverrides;
}

export class UpdateQVSettingsDto {
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @Type(() => QVSettings)
  @IsNotEmpty()
  @ValidateNested()
  setting: QVSettings;
}
