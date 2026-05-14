import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Question } from '../question.schema';
import { QUESTIONS_COLLECTION } from '../constants';

export type TextInputQuestionDocument = TextInputQuestion & Document;

@Schema({
  timestamps: true,
  collection: QUESTIONS_COLLECTION, // Store in the same collection as other questions
})
export class TextInputQuestion extends Question {
  // No need to explicitly define _id as Mongoose will handle this automatically

  @Prop({ default: 'text' })
  type: string;

  @Prop()
  description: string;

  @Prop()
  question: string;

  @Prop({ default: false })
  multiline: boolean;

  @Prop({ required: false })
  maxLength?: number;

  @Prop({ type: Types.ObjectId, ref: 'QuestionGroup' })
  groupId: Types.ObjectId;
}

export const TextInputQuestionSchema =
  SchemaFactory.createForClass(TextInputQuestion);
