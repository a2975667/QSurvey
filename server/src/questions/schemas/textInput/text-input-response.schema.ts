import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TextInputResponseDocument = TextInputResponse & Document;

@Schema()
export class TextInputResponse {
  @Prop()
  response: string;
}

export const TextInputResponseSchema = SchemaFactory.createForClass(
  TextInputResponse,
);
