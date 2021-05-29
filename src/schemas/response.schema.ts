import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResponseDocument = Response & Document;

@Schema()
export class Response {
  @Prop()
  userId: string;

  @Prop()
  questionId: string;

  @Prop()
  participant: string;

  @Prop()
  type: string;

  @Prop()
  responseTime: number;
}

export const ResponseSchema = SchemaFactory.createForClass(Response);
