import { PartialType } from '@nestjs/swagger';
import { CreateApprovalQuestionDto } from './createApprovalQuestion.dto';

export class UpdateApprovalQuestionDto extends PartialType(
  CreateApprovalQuestionDto,
) {}
