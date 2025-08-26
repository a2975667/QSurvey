import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QVOptionDocument = QVOption & Document;

@Schema()
export class QVOption {
  @Prop()
  optionId: string;

  @Prop()
  description: string;

  @Prop()
  optionName: string;
}

export const QVOptionSchema = SchemaFactory.createForClass(QVOption);
