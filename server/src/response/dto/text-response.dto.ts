import { IsNotEmpty, IsString } from 'class-validator';

export class ResponseTypeText {
  @IsString()
  @IsNotEmpty()
  text: string;
}

