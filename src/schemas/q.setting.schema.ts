import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema()
export class Setting {
  @Prop()
  version: number;

  @Prop()
  questionType: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Setting);
