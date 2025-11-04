import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

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

export class QvBinsDto {
  @IsOptional()
  @IsBoolean()
  hasUndecided?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSkip?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userDefined?: string[];
}

export class QvNavigatorDto {
  @IsArray()
  @IsString({ each: true })
  order: string[];

  @IsOptional()
  @IsString()
  activeQuestionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completed?: string[];
}

export class ResponseTypeQV {
  @Type(() => QvVote)
  @IsNotEmpty()
  @ValidateNested({ each: true })
  votes: QvVote[];

  @IsOptional()
  @IsNumber()
  totalCredits?: number;

  @IsOptional()
  @IsObject()
  group?: Record<string, string>;

  @IsOptional()
  @IsObject()
  position?: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => QvBinsDto)
  bins?: QvBinsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoriesOrder?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => QvNavigatorDto)
  navigator?: QvNavigatorDto;
}
