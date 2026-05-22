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

  @Prop({ type: Object })
  labelOverrides?: Record<string, unknown>;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
