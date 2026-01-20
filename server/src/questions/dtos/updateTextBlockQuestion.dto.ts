import { PartialType } from '@nestjs/swagger';
import { CreateTextBlockQuestionDto } from './createTextBlockQuestion.dto';

export class UpdateTextBlockQuestionDto extends PartialType(
  CreateTextBlockQuestionDto,
) {}
