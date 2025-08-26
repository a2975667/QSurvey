import { PartialType } from '@nestjs/swagger';
import { CreateTextQuestionDto } from './createTextQuestion.dto';

export class UpdateTextQuestionDto extends PartialType(
  CreateTextQuestionDto,
) {}
