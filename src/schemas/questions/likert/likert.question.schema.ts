import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Question } from '../../question.schema';

export type QVQuestionDocument = QVQuestion & Document;

@Schema()
export class QVQuestion extends Question {
  @Prop()
  _id: string;

  @Prop()
  type: string;

  @Prop()
  description: string;

  @Prop()
  question: string;

  @Prop()
  scale: string[];
}

export const QVQuestionSchema = SchemaFactory.createForClass(QVQuestion);
