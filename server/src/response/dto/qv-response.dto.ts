import { Optional } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmpty, ValidateNested } from 'class-validator';

export class ResponseTypeQV {
  @Type(() => QvVote)
  @IsNotEmpty()
  @ValidateNested()
  votes: QvVote[];

  @Optional()
  @IsString()
  group: string;

  @Optional()
  @IsString()
  position: number;
}

export class QvVote {
  @IsString()
  @IsNotEmpty()
  optionId: string;

  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsNumber()
  @IsNotEmpty()
  votes: number;
}
