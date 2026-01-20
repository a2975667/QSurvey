import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Question } from '../question.schema';
import { QUESTIONS_COLLECTION } from '../constants';

export type TextBlockQuestionDocument = TextBlockQuestion & Document;

@Schema({
  timestamps: true,
  collection: QUESTIONS_COLLECTION,
})
export class TextBlockQuestion extends Question {
  @Prop({ default: 'text_block' })
  type: string;

  @Prop()
  content: string;

  @Prop({ default: false })
  newPage: boolean;
}

export const TextBlockQuestionSchema =
  SchemaFactory.createForClass(TextBlockQuestion);
