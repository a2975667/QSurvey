import { PartialType } from '@nestjs/swagger';
import { CreateSelectionQuestionDto } from './createSelectionQuestion.dto';

export class UpdateSelectionQuestionDto extends PartialType(
  CreateSelectionQuestionDto,
) {}
