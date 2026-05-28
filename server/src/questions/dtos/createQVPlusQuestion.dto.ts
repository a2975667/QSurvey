import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { QVOption } from './createQVQuestion.dto';

export class QVPlusChoice {
  @IsString()
  @IsNotEmpty()
  choiceId: string;

  @IsString()
  @IsNotEmpty()
  label: string;
}

export class QVPlusFollowup {
  @IsString()
  @IsNotEmpty()
  followupId: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @Type(() => QVPlusChoice)
  @IsNotEmpty()
  @ValidateNested()
  choices: QVPlusChoice[];
}

export class QVPlusRound {
  @IsString()
  @IsNotEmpty()
  roundId: string;

  @IsOptional()
  @IsString()
  voteTitle?: string;

  @IsOptional()
  @IsString()
  voteDescription?: string;

  @IsOptional()
  @IsString()
  selectionTitle?: string;

  @IsOptional()
  @IsString()
  selectionDescription?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(upvote|downvote|both|none)$/)
  requiredVoteFilter: string;

  @Type(() => QVPlusFollowup)
  @IsNotEmpty()
  @ValidateNested()
  followupQuestions: QVPlusFollowup[];
}

export class QVPlusSettings {
  @IsNumber()
  @IsNotEmpty()
  totalCredits: number;

  @IsNumber()
  @IsNotEmpty()
  version: number;

  @IsString()
  @IsNotEmpty()
  @Matches('qvplus')
  questionType: string;

  @IsNumber()
  sampleOption: number;

  @IsOptional()
  @IsBoolean()
  showInstructions?: boolean;

  @Type(() => QVPlusRound)
  @IsNotEmpty()
  @ValidateNested()
  rounds: QVPlusRound[];
}

export class CreateUpdateQVPlusQuestionDto {
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  @Matches(/^qvplus$/)
  type: string;

  @IsString()
  description: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @Type(() => QVPlusSettings)
  @IsNotEmpty()
  @ValidateNested()
  setting: QVPlusSettings;

  @Type(() => QVOption)
  @IsNotEmpty()
  @ValidateNested()
  options: QVOption[];

  @IsOptional()
  @IsBoolean()
  respondentResultsEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  insertPosition: number;
}
