import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop()
  email: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  displayName: string;

  @Prop()
  username: string;

  @Prop()
  surveys: string[];

  @Prop()
  password: string;

  @Prop()
  profilePictureURI: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
