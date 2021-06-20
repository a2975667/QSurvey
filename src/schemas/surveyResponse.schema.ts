import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SurveyResponseDocument = SurveyResponse & Document;

@Schema()
export class SurveyResponse {
  // uuid keeps track of survey responses
  @Prop()
  userUUID: string;

  // saves ukey if present
  @Prop()
  UKey: string;

  // saves skey if present
  @Prop()
  SKey: string;

  // saves ukey if present
  @Prop()
  surveyId: string;

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
  // Optional.
  @Prop()
  lastUpdate: Date;

  // schema saves in UTC Datetime for TTL
  // Optional
  @Prop()
  endTime: Date;

  @Prop()
  questionResponses: Types.ObjectId[];
}

export const SurveyResponseSchema = SchemaFactory.createForClass(
  SurveyResponse,
);
