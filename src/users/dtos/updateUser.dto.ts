import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';
import { Role } from 'src/auth/roles/role.enum';
import { Types } from 'mongoose';

export class UpdateUserDto {
  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiProperty()
  @IsOptional()
  firstName: string;

  @ApiProperty()
  @IsOptional()
  lastName: string;

  @ApiProperty()
  @IsOptional()
  profilePictureURI: string;

  @ApiProperty()
  @IsOptional()
  roles: Role[];

  @ApiProperty()
  @IsOptional()
  surveys: Types.ObjectId[];
}
