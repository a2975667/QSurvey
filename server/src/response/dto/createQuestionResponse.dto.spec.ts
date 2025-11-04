import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuestionResponseDto } from './createQuestionResponse.dto';

describe('CreateQuestionResponseDto validation', () => {
  const basePayload = {
    surveyId: '507f191e810c19729de860ea',
    questionId: '507f191e810c19729de860eb',
    responseContent: {
      votes: [
        { optionId: 'opt-1', optionName: 'Option 1', votes: 2 },
        { optionId: 'opt-2', optionName: 'Option 2', votes: -2 },
      ],
    },
  };

  it('accepts payload for new survey response', async () => {
    const dto = plainToClass(CreateQuestionResponseDto, {
      ...basePayload,
      IsNewSurveyResponse: true,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts payload for existing survey response with uuid', async () => {
    const dto = plainToClass(CreateQuestionResponseDto, {
      ...basePayload,
      uuid: '6efb5115-7f88-4bc1-9076-4e1fd0a6f7e2',
      surveyResponseId: '507f191e810c19729de860ef',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects payload missing response linkage', async () => {
    const dto = plainToClass(CreateQuestionResponseDto, {
      ...basePayload,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
