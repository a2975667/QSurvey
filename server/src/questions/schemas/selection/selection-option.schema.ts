import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SelectionOptionDocument = SelectionOption & Document;

@Schema()
export class SelectionOption {
  @Prop()
  optionId: string;

  @Prop()
  optionName: string;

  @Prop()
  description?: string;

  @Prop({ default: false })
  isExclusive?: boolean;
}

export const SelectionOptionSchema =
  SchemaFactory.createForClass(SelectionOption);
