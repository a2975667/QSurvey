import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema({ collection: 'questions' })
export class Question {
  @Prop()
  type: string;

  @Prop()
  responses: string[];
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
