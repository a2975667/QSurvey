import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResponseDocument = Response & Document;

@Schema()
export class Response {
  @Prop()
  _id: string;

  @Prop()
  userId: string;

  @Prop()
  questionId: string;

  @Prop()
  subject: string;

  @Prop()
  type: string;

  @Prop()
  responseTime: number;
}

export const ResponseSchema = SchemaFactory.createForClass(Response);
