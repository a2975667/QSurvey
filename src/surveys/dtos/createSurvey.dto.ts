import { IsString } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  title: string;

  @IsString()
  description: string;
}
