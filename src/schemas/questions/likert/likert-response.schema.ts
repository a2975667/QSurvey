import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LikertResponseDocument = LikertResponse & Document;

@Schema()
export class LikertResponse {
  @Prop()
  optionName: string;

  @Prop()
  selection: string;
}

export const LikertResponseSchema = SchemaFactory.createForClass(
  LikertResponse,
);
