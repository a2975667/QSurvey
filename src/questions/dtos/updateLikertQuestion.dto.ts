import { PartialType } from '@nestjs/swagger';
import { CreateLikertQuestionDto } from './createLikertQuestion.dto';

export class UpdateLikertQuestionDto extends PartialType(
  CreateLikertQuestionDto,
) {}
