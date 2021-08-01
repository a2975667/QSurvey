import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class GetUserSurveyResponseDTO {
  @IsUUID()
  uuid: string;

  @IsOptional()
  @IsString()
  sKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  uKey: string;
}
