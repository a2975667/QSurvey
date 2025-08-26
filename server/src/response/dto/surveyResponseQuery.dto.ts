import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsNumber,
  IsInt,
  Max,
  Min,
  Equals,
} from 'class-validator';

export class SurveyResponseQuery {
  @IsUUID()
  @IsOptional()
  uuid: string;

  @IsOptional()
  @IsString()
  sKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  uKey: string;

  @IsOptional()
  @IsString()
  sort: string;

  @IsOptional()
  direction: number;

  @IsOptional()
  @IsNumber()
  limit: number;
}
