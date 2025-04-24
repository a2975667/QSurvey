import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateUpdateLikertQuestionDto {
  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  _id?: Types.ObjectId;

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
}