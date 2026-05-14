import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LookupUserByEmailDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail(
    {},
    { message: 'Email is invalid. Please enter a valid email address.' },
  )
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
