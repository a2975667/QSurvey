import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from './user.schema';
import { Tag } from './tag.schema';
import { Question } from './question.schema';
import { Response } from './response.schema';

export type SurveyDocument = Survey & Document;

@Schema()
export class Survey {
  @Prop()
  title: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' })
  tags: Tag[];

  @Prop()
  description: string;

  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Question' })
  // questions: Question[];

  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Response' })
  // responses: Response[];

  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  // collaborators: User[];
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
