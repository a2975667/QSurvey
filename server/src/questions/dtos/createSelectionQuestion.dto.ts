import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

export class SelectionControlRuleThresholdsDto {
  @IsInt()
  @Min(1)
  singleToDropdownAt: number;
}

export class SelectionOptionDto {
  @IsString()
  @IsOptional()
  optionId?: string;

  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isExclusive?: boolean;
}

export class CreateSelectionQuestionDto {
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['single', 'multi'])
  @IsOptional()
  selectionMode?: string;

  @IsString()
  @IsIn(['checkbox', 'radio', 'dropdown', 'auto'])
  @IsOptional()
  displayControl?: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  minSelections?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxSelections?: number;

  @IsBoolean()
  @IsOptional()
  randomizeOptions?: boolean;

  @ValidateNested()
  @Type(() => SelectionControlRuleThresholdsDto)
  @IsOptional()
  controlRuleThresholds?: SelectionControlRuleThresholdsDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SelectionOptionDto)
  options: SelectionOptionDto[];

  @IsMongoId()
  @IsOptional()
  groupId?: string;
}
