import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Question } from '../question.schema';
import { QVOption } from '../qv/qv-options.schema';
import { QVPlusSetting } from './qvplus-setting.schema';
import { QUESTIONS_COLLECTION } from '../constants';

// QVPlus questions live in the same 'questions' collection as every other question type;
// the `type` field (set on the base Question) distinguishes them.
export type QVPlusQuestionDocument = QVPlusQuestion & Document;

@Schema({ collection: QUESTIONS_COLLECTION })
export class QVPlusQuestion extends Question {
  @Prop()
  description: string;

  @Prop()
  question: string;

  @Prop()
  setting: QVPlusSetting;

  // Reuse QV's option schema — option shape is identical across QV and QVPlus.
  @Prop()
  options: QVOption[];
}

export const QVPlusQuestionSchema = SchemaFactory.createForClass(QVPlusQuestion);
