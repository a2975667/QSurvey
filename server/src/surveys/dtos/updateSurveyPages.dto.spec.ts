import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PageContentDto,
  SurveyPageDto,
  UpdateSurveyPagesDto,
  ReorderPagesDto,
} from './updateSurveyPages.dto';

describe('UpdateSurveyPagesDto validation', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToClass(UpdateSurveyPagesDto, {
      pages: [
        {
          id: 'page-1',
          title: 'Intro',
          description: 'Overview',
          content: [
            { body: 'Welcome', format: 'text' },
            { body: '<p>HTML content</p>', format: 'html' },
          ],
          questionIds: ['507f1f77bcf86cd799439011'],
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid question identifiers and formats', async () => {
    const dto = plainToClass(UpdateSurveyPagesDto, {
      pages: [
        {
          id: 'page-1',
          content: [{ body: 'oops', format: 'markdownish' }],
          questionIds: ['not-an-object-id'],
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const [pageError] = errors[0].children || [];
    expect(pageError).toBeDefined();
  });
});

describe('ReorderPagesDto validation', () => {
  it('validates order array of strings', async () => {
    const dto = plainToClass(ReorderPagesDto, {
      order: ['page-1', 'page-2'],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid order payload', async () => {
    const dto = plainToClass(ReorderPagesDto, {
      order: [123, null],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
