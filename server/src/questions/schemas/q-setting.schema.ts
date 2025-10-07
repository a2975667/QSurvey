import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema()
export class Setting {
  @Prop()
  questionType?: string;

  @Prop()
  totalCredits?: number;

  @Prop()
  version?: number;

  @Prop()
  isAvailable?: boolean;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);

