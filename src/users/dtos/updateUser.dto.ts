import { IsEmail, IsOptional } from 'class-validator';
import { Role } from 'src/auth/roles/role.enum';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email: string;

  @IsOptional()
  firstName: string;

  @IsOptional()
  lastName: string;

  @IsOptional()
  profilePictureURI: string;

  @IsOptional()
  roles: Role[];

  @IsOptional()
  surveys: string[];
}
