import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionResponseDocument = QuestionResponse & Document;

@Schema({ collection: 'QuestionResponses', strict: false })
export class QuestionResponse {
  // backtrack surveyResponse for metatdata when needed.
  @Prop()
  surveyResponseId: Types.ObjectId;

  // question that this response corresponds to
  @Prop()
  questionId: Types.ObjectId;

  // duplicate value for TTL. Value in seconds.
  @Prop()
  expireCountdown: number;

  // TODO: cannot create a type that is either likert or qv shape
  // forcing to do raw mdb query

  @Prop()
  createdTime: Date;
}

export const QuestionResponseSchema = SchemaFactory.createForClass(
  QuestionResponse,
);
