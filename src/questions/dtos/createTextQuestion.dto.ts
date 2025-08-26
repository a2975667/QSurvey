import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateTextQuestionDto {
  

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
  @IsBoolean()
  @IsNotEmpty()
  multiline: boolean;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  maxLength?: number;
  
  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  groupId?: string;
}