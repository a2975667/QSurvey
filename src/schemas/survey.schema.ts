import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { Question } from './question.schema';

export type SurveyDocument = Survey & Document;

@Schema()
export class Survey {
  @Prop()
  title: string;

  @Prop()
  tags: string[];

  @Prop()
  description: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Question' })
  questions: Question[];

  @Prop()
  responses: string[];

  @Prop()
  collaborators: string[];
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
