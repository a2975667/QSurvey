import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Question } from '../question.schema';
import { ApprovalOption, ApprovalOptionSchema } from './approval-option.schema';
import { QUESTIONS_COLLECTION } from '../constants';

export type ApprovalQuestionDocument = ApprovalQuestion & Document;

@Schema({ collection: QUESTIONS_COLLECTION })
export class ApprovalQuestion extends Question {
  @Prop({ default: 'approval' })
  type: string;

  @Prop()
  question: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  randomizeOptions: boolean;

  @Prop()
  maxApprovals?: number;

  @Prop({ default: false })
  unlimitedApprovals: boolean;

  @Prop({ type: [ApprovalOptionSchema], default: [] })
  options: ApprovalOption[];
}

export const ApprovalQuestionSchema =
  SchemaFactory.createForClass(ApprovalQuestion);
