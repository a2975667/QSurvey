import { IsEmail, IsNotEmpty } from 'class-validator';

export class LookupUserByEmailDto {
  @IsEmail({}, { message: 'Email is invalid. Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
