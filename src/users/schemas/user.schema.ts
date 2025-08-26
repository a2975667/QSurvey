import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from 'src/auth/roles/role.enum';

export type UserDocument = User & Document;

@Schema()
export class User {
  @ApiProperty()
  @Prop()
  email: string;

  @ApiProperty()
  @Prop()
  firstName: string;

  @ApiProperty()
  @Prop()
  lastName: string;

  @ApiProperty()
  @Prop()
  displayName: string;

  @ApiProperty()
  @Prop()
  username: string;

  @ApiProperty()
  @Prop()
  surveys: Types.ObjectId[];

  @ApiProperty()
  @Prop()
  password: string;

  @ApiProperty()
  @Prop()
  profilePictureURI: string;

  @ApiProperty()
  @Prop()
  roles: Role[];
}

export const UserSchema = SchemaFactory.createForClass(User);
