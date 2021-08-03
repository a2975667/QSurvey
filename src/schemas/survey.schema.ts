import { SurveySettings } from './surveySettings.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SurveyDocument = Survey & Document;

@Schema()
export class Survey {
  @Prop()
  title: string;

  @Prop()
  tags: string[];

  @Prop()
  description: string;

  @Prop()
  questions: Types.ObjectId[];

  @Prop()
  responses: string[];

  @Prop()
  collaborators: Types.ObjectId[];

  @Prop()
  settings: SurveySettings;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
