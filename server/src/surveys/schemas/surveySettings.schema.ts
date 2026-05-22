import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SurveySettingsDocument = SurveySettings & Document;

@Schema()
export class SurveySettings {
  @Prop()
  hasSKey: boolean;

  @Prop()
  sKeyValue: string;

  @Prop()
  hasUKey: boolean;

  @Prop()
  isAvailable: boolean;

  @Prop()
  respondentsCanViewResults?: boolean;

  @Prop()
  locale?: string;
}

export const SurveySettingsSchema =
  SchemaFactory.createForClass(SurveySettings);
