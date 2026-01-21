import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTextBlockQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  newPage?: boolean;
}
