import { IsArray, IsOptional, IsString } from 'class-validator';

export class ResponseTypeSelection {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  selectedOptionIds?: string[];
}
