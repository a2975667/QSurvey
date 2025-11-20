import { IsArray, IsOptional, IsString } from 'class-validator';

export class ResponseTypeApproval {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  approvals?: string[];
}
