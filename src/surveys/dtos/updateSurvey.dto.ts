import { IsString, IsOptional } from 'class-validator';

export class UpdateSurveyDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;
}
