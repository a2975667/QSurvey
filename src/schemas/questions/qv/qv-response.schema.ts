import { Response } from '../../response.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QVResponseDocument = QVResponse & Document;

@Schema()
export class QVResponse extends Response {
  @Prop()
  votes: { [optionId: string]: number };
}

export const QVResponseSchema = SchemaFactory.createForClass(QVResponse);
