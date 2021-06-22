import { IsEmail, IsNotEmpty } from 'class-validator';
import { Role } from 'src/auth/roles/role.enum';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsNotEmpty()
  profilePictureURI: string;

  @IsNotEmpty()
  roles: Role[];
}
