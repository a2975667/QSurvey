import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Setting } from './q-setting.schema';

export type QuestionDocument = Question & Document;

@Schema({ collection: 'questions' })
export class Question {
  //deprecate this
  @Prop()
  type: string;

  @Prop()
  responses: string[];

  //this needs to be fixed
  @Prop()
  setting: Setting;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
