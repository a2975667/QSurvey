import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
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

  @Prop()
  questions: Types.ObjectId[];

  @Prop()
  responses: string[];

  @Prop()
  collaborators: string[];
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
