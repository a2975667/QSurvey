import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmpty, ValidateNested } from 'class-validator';

export class ResponseTypeQV {
  @Type(() => QvVote)
  @IsNotEmpty()
  @ValidateNested()
  votes: QvVote[];
}

export class QvVote {
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsNumber()
  @IsNotEmpty()
  votes: number;
}
