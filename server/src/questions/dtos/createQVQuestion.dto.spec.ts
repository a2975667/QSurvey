import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUpdateQVQuestionDto } from './createQVQuestion.dto';

const hasConstraint = (errors: Array<{ constraints?: object; children?: any[] }>, key: string): boolean =>
  errors.some(
    (error) =>
      Boolean(error.constraints && key in error.constraints) ||
      hasConstraint(error.children || [], key),
  );

describe('CreateUpdateQVQuestionDto validation', () => {
  const basePayload = {
    surveyId: '507f191e810c19729de860ea',
    type: 'qv',
    description: 'Question description',
    question: 'Question prompt',
    setting: {
      totalCredits: 10,
      version: 1,
      questionType: 'qv',
      sampleOption: 0,
      showInstructions: true,
    },
    options: [
      {
        optionId: 'opt-1',
        optionName: 'Option 1',
        description: 'Option 1 description',
      },
    ],
  };

  it('accepts QV label overrides', async () => {
    const dto = plainToClass(CreateUpdateQVQuestionDto, {
      ...basePayload,
      setting: {
        ...basePayload.setting,
        labelOverrides: {
          votePositive: '支持票',
          voteNegative: '反對票',
          voteNone: '未投票',
          sortByVotes: '依票數排序',
          binLabels: {
            Positive: '正向',
            Neutral: '中立',
            Negative: '負向',
            Undecided: '尚未決定',
            Skip: '暫時略過',
          },
        },
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects overlong QV label overrides', async () => {
    const dto = plainToClass(CreateUpdateQVQuestionDto, {
      ...basePayload,
      setting: {
        ...basePayload.setting,
        labelOverrides: {
          votePositive: 'x'.repeat(81),
        },
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(hasConstraint(errors, 'maxLength')).toBe(true);
  });
});
