import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema()
export class Question {
  @Prop()
  _id: string;

  @Prop()
  type: string; //this needs to restric type.
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
