import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsBoolean } from 'class-validator';
import { Types } from 'mongoose';

export class RemoveQuestionDto {
  @ApiProperty({ description: 'Survey ID from which to unlink the question' })
  @IsMongoId()
  surveyId: Types.ObjectId;

  @ApiProperty({ description: 'Also remove related responses within this survey', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  cleanupResponses?: boolean = false;
}

