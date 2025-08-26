import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ParticipantDocument = Participant & Document;

@Schema()
export class Participant {
  @Prop()
  email: string;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
