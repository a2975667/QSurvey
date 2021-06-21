import { IsString } from 'class-validator';
import { IsNotEmpty } from 'class-validator';

export class ResponseTypeLikert {
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsNotEmpty()
  selection: string;
}
