import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PageContentDto {
  @IsString()
  body: string;

  @IsEnum(['markdown', 'html', 'text'])
  format: 'markdown' | 'html' | 'text';
}

export class SurveyPageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageContentDto)
  content?: PageContentDto[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  questionIds?: string[];
}

export class UpdateSurveyPagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyPageDto)
  pages: SurveyPageDto[];
}

export class ReorderPagesDto {
  @IsArray()
  @IsString({ each: true })
  order: string[]; // array of page ids in desired order
}
