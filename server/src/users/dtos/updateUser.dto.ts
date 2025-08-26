import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './createUser.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsOptional()
  surveys: Types.ObjectId[];
}