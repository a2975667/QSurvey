import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
export class QVOption {
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class UpdateQVOptionsDto {
  @IsNotEmpty()
  surveyId: string;

  @Type(() => QVOption)
  @IsNotEmpty()
  @ValidateNested()
  options: QVOption[];
}
