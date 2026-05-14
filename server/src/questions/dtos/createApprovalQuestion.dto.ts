import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

export class ApprovalOptionDto {
  @IsString()
  @IsOptional()
  optionId?: string;

  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateApprovalQuestionDto {
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsBoolean()
  @IsOptional()
  randomizeOptions?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxApprovals?: number;

  @IsBoolean()
  @IsOptional()
  unlimitedApprovals?: boolean;

  @IsBoolean()
  @IsOptional()
  respondentResultsEnabled?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApprovalOptionDto)
  options: ApprovalOptionDto[];
}
