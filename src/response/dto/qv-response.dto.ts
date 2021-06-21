import { IsNumber, IsString } from 'class-validator';
import { IsNotEmpty, ValidateNested } from 'class-validator';

export class ResponseTypeQV {
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
