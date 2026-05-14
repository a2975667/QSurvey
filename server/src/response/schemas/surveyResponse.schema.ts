import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SurveyResponseDocument = SurveyResponse & Document;

@Schema({ collection: 'SurveyResponses' })
export class SurveyResponse {
  // uuid keeps track of survey responses
  @Prop()
  uuid: string;

  // saves ukey if present
  @Prop()
  uKey: string;

  // saves skey if present
  @Prop()
  sKey: string;

  // saves ukey if present
  @Prop()
  surveyId: Types.ObjectId;

  // survey status:
  // Incomplete | Completed
  @Prop()
  status: string;

  // API should specify countdown seconds
  // required if survey status is false
  @Prop()
  expireCountdown: number;

  // schema saves in UTC Datetime for TTL
  // Optional
  @Prop()
  startTime: Date;

  // schema saves in UTC Datetime for TTL
  // this is not really helpful and slows down.
  // not used.
  // Optional.
  @Prop()
  lastUpdate: Date;

  // schema saves in UTC Datetime for TTL
  // Optional
  @Prop()
  endTime: Date;

  @Prop()
  questionResponses: Types.ObjectId[];

  @Prop({ type: Object })
  qvNavigator?: {
    order: string[];
    activeQuestionId?: string;
    completed?: string[];
  };
}

export const SurveyResponseSchema =
  SchemaFactory.createForClass(SurveyResponse);

SurveyResponseSchema.index({ surveyId: 1, status: 1 });
SurveyResponseSchema.index({ surveyId: 1 });
