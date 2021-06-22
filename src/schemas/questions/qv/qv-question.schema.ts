import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Question } from '../../question.schema';
import { QVOption } from './qv-options.schema';
import { QVSetting } from './qv-setting.schema';

export type QVQuestionDocument = QVQuestion & Document;

@Schema({ collection: 'questions' })
export class QVQuestion extends Question {
  @Prop()
  description: string;

  @Prop()
  question: string;

  @Prop()
  setting: QVSetting;

  @Prop()
  options: QVOption[];
}

export const QVQuestionSchema = SchemaFactory.createForClass(QVQuestion);
