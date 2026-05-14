import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Question } from '../question.schema';
import { QUESTIONS_COLLECTION } from '../constants';

export type LikertQuestionDocument = LikertQuestion & Document;

@Schema({
  timestamps: true,
  collection: QUESTIONS_COLLECTION, // Store in the same collection as other questions
})
export class LikertQuestion extends Question {
  // No need to explicitly define _id as Mongoose will handle this automatically

  @Prop({ default: 'likert' })
  type: string;

  @Prop()
  description: string;

  @Prop()
  question: string;

  @Prop({ type: [String], default: ['1', '2', '3', '4', '5'] })
  scale: string[];

  @Prop()
  minLabel: string;

  @Prop()
  maxLabel: string;

  @Prop({ type: Types.ObjectId, ref: 'QuestionGroup' })
  groupId: Types.ObjectId;
}

export const LikertQuestionSchema =
  SchemaFactory.createForClass(LikertQuestion);
