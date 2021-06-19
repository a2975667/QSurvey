import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SurveySettingsDocument = SurveySettings & Document;

@Schema()
export class SurveySettings {
  @Prop()
  SKey: boolean;

  @Prop()
  SKeyValue: string;

  @Prop()
  UKey: boolean;
}

export const SurveySettingsSchema = SchemaFactory.createForClass(
  SurveySettings,
);
