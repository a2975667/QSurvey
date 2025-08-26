import { Optional } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { QVOption } from 'src/questions/dtos/createQVQuestion.dto';

export class UpdateQVOptionsDto {
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @Type(() => QVOption)
  @IsNotEmpty()
  @ValidateNested()
  options: QVOption[];
}
