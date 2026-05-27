import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class QVBinLabelOverrides {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  Positive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Neutral?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Negative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Undecided?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  Skip?: string;
}

export class QVLabelOverrides {
  @IsOptional()
  @ValidateNested()
  @Type(() => QVBinLabelOverrides)
  binLabels?: QVBinLabelOverrides;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  votePositive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voteNegative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voteNone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sortByVotes?: string;
}
