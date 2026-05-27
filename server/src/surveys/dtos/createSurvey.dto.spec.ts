import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSurveyDto } from './createSurvey.dto';

describe('CreateSurveyDto validation', () => {
  const basePayload = {
    title: 'Survey title',
    description: 'Survey description',
    settings: {
      hasSKey: false,
      hasUKey: false,
      isAvailable: true,
    },
  };

  it('accepts supported survey locales', async () => {
    const dto = plainToClass(CreateSurveyDto, {
      ...basePayload,
      settings: {
        ...basePayload.settings,
        locale: 'zh-TW',
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported survey locales', async () => {
    const dto = plainToClass(CreateSurveyDto, {
      ...basePayload,
      settings: {
        ...basePayload.settings,
        locale: 'fr-FR',
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].children?.[0].constraints).toHaveProperty('isIn');
  });
});
