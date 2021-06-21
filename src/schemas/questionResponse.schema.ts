import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionResponseDocument = QuestionResponse & Document;

@Schema({ collection: 'QuestionResponses' })
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
}

export const QuestionResponseSchema = SchemaFactory.createForClass(
  QuestionResponse,
);
