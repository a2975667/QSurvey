import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApprovalOptionDocument = ApprovalOption & Document;

@Schema()
export class ApprovalOption {
  @Prop()
  optionId: string;

  @Prop()
  optionName: string;

  @Prop()
  description: string;
}

export const ApprovalOptionSchema = SchemaFactory.createForClass(
  ApprovalOption,
);
