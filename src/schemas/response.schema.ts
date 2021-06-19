import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResponseDocument = Response & Document;

@Schema()
export class Response {
  @Prop()
  userId: string;

  @Prop()
  surveyId: string;

  @Prop()
  questionId: string;

  @Prop()
  participantEmail: string;

  @Prop()
  type: string;

  @Prop()
  responseTime: number;
}

export const ResponseSchema = SchemaFactory.createForClass(Response);
