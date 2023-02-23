import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Setting } from 'src/schemas/q-setting.schema';

export type QVSettingsDocument = QVSetting & Document;

@Schema()
export class QVSetting extends Setting {
  @Prop()
  totalCredits?: number;

  @Prop()
  sampleOption?: number;
}

export const QVSettingsSchema = SchemaFactory.createForClass(QVSetting);
