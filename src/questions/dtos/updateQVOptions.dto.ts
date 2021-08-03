import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
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
  surveyId: Types.ObjectId;

  @Type(() => QVOption)
  @IsNotEmpty()
  @ValidateNested()
  options: QVOption[];
}
