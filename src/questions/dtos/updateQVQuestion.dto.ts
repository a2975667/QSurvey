import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class QVSettingsDto {
  @IsNumber()
  totalCredits: number;
}

export class QVOption {
  @IsString()
  title: string;

  @IsString()
  description: string;
}

export class UpdateQVQuestionDto {
  @IsString()
  type: 'qv';

  @IsString()
  description: string;

  @IsString()
  question: string;

  @Type(() => QVSettingsDto)
  setting: QVSettingsDto;

  @Type(() => QVOption)
  options: QVOption[];
}
