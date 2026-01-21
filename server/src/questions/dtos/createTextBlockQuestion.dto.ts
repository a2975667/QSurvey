import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class CreateTextBlockQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeHtml(value) : value))
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
