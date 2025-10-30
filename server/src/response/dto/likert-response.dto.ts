import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResponseTypeLikert {
  @IsString()
  @IsOptional()
  optionName?: string;

  @IsString()
  @IsNotEmpty()
  selection: string;
}
