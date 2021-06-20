import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SurveySettingsDocument = SurveySettings & Document;

@Schema()
export class SurveySettings {
  @Prop()
  HasSKey: boolean;

  @Prop()
  SKeyValue: string;

  @Prop()
  HasUKey: boolean;

  @Prop()
  IsAvaliable: boolean;
}

export const SurveySettingsSchema = SchemaFactory.createForClass(
  SurveySettings,
);
