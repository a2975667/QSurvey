import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateLikertQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  scale: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  minLabel?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  maxLabel?: string;

  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  groupId?: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  respondentResultsEnabled?: boolean;
}
