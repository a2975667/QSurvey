import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Question } from '../question.schema';
import {
  SelectionOption,
  SelectionOptionSchema,
} from './selection-option.schema';
import { QUESTIONS_COLLECTION } from '../constants';

export type SelectionQuestionDocument = SelectionQuestion & Document;

@Schema({ collection: QUESTIONS_COLLECTION })
export class SelectionQuestion extends Question {
  @Prop({ default: 'selection' })
  type: string;

  @Prop()
  question: string;

  @Prop()
  description: string;

  @Prop({ default: 'single' })
  selectionMode: string;

  @Prop({ default: 'radio' })
  displayControl: string;

  @Prop({ default: false })
  required: boolean;

  @Prop()
  minSelections?: number;

  @Prop()
  maxSelections?: number;

  @Prop({ default: false })
  randomizeOptions: boolean;

  @Prop({ type: Object })
  controlRuleThresholds?: { singleToDropdownAt?: number };

  @Prop({ type: [SelectionOptionSchema], default: [] })
  options: SelectionOption[];

  @Prop({ type: Types.ObjectId, ref: 'QuestionGroup', required: false })
  groupId?: Types.ObjectId;
}

export const SelectionQuestionSchema =
  SchemaFactory.createForClass(SelectionQuestion);
