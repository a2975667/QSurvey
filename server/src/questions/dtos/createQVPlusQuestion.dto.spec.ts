// Why this spec exists — responding to a review suggestion to add
// @ValidateNested({ each: true }), @IsArray and @ArrayMinSize(1):
//
// 1. @ValidateNested() ALREADY validates every array element recursively in
//    class-validator 0.14.1 — { each: true } is NOT required. The tests below
//    corrupt deep nested items (incl. the 2nd array element and the 3-level
//    -deep choices[].label) and assert the exact failing leaf path, proving
//    per-element validation already runs.
//
// 2. No @ArrayMinSize(1): the Mongoose schemas default rounds / followupQuestions
//    / choices to [], so empty arrays are valid by design. The "accepts empty …"
//    tests lock that in and guard against an accidental ArrayMinSize regression.
import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateUpdateQVPlusQuestionDto } from './createQVPlusQuestion.dto';

// Deep clone helper so each test can tweak one field without bleeding into others.
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// A minimal, well-formed qvplus question payload: 1 option, 1 round, the round
// owning 1 followup, the followup owning 1 choice.
const validPayload = {
  surveyId: '507f191e810c19729de860ea',
  type: 'qvplus',
  description: '',
  question: 'Which do you prefer?',
  options: [{ optionId: 'opt-1', optionName: 'Alpha', description: 'first' }],
  setting: {
    totalCredits: 100,
    version: 1,
    questionType: 'qvplus',
    sampleOption: 0,
    rounds: [
      {
        roundId: 'round-1',
        requiredVoteFilter: 'both',
        followupQuestions: [
          {
            followupId: 'fu-1',
            prompt: 'Why?',
            choices: [{ choiceId: 'c-1', label: 'Because' }],
          },
        ],
      },
    ],
  },
};

const errorsFor = async (payload: any): Promise<ValidationError[]> => {
  const dto = plainToClass(CreateUpdateQVPlusQuestionDto, payload);
  return validate(dto);
};

// Flattens the nested ValidationError tree into dot-paths of the *leaves* that
// actually carry a failed constraint, e.g.
//   "setting.rounds.0.followupQuestions.0.choices.0.label".
// Array indices appear as their own path segment ("0"), which is exactly how we
// prove that per-element validation reached a specific array entry.
const leafPaths = (errors: ValidationError[], prefix = ''): string[] => {
  const paths: string[] = [];
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    if (e.constraints) paths.push(path);
    if (e.children?.length) paths.push(...leafPaths(e.children, path));
  }
  return paths;
};

describe('CreateUpdateQVPlusQuestionDto validation', () => {
  it('accepts a well-formed qvplus payload', async () => {
    expect(await errorsFor(validPayload)).toHaveLength(0);
  });

  // --- Boundaries that MUST keep passing (guards against an accidental
  //     @ArrayMinSize that would reject schema-allowed empty arrays). ---

  it('accepts a round with empty followupQuestions', async () => {
    const p = clone(validPayload);
    p.setting.rounds[0].followupQuestions = [];
    expect(await errorsFor(p)).toHaveLength(0);
  });

  it('accepts a followup with empty choices', async () => {
    const p = clone(validPayload);
    p.setting.rounds[0].followupQuestions[0].choices = [];
    expect(await errorsFor(p)).toHaveLength(0);
  });

  // --- Per-element validation: a malformed nested item must fail AT ITS OWN
  //     PATH. Asserting the exact leaf path (not just "some error") proves the
  //     failure comes from the corrupted field — not a coincidental error
  //     elsewhere — and that validation descended into the array element. ---

  it('rejects a choice missing its label, at the choice element path', async () => {
    const p = clone(validPayload);
    delete p.setting.rounds[0].followupQuestions[0].choices[0].label;
    const paths = leafPaths(await errorsFor(p));
    expect(paths).toContain(
      'setting.rounds.0.followupQuestions.0.choices.0.label',
    );
  });

  it('rejects the SECOND choice in an array (each element is validated)', async () => {
    const p = clone(validPayload);
    p.setting.rounds[0].followupQuestions[0].choices = [
      { choiceId: 'c-1', label: 'ok' }, // index 0 is fine
      { choiceId: '', label: '' }, // index 1 is broken
    ];
    const paths = leafPaths(await errorsFor(p));
    // The failure must land on index 1, proving every element is checked.
    expect(paths).toContain(
      'setting.rounds.0.followupQuestions.0.choices.1.choiceId',
    );
    expect(paths).toContain(
      'setting.rounds.0.followupQuestions.0.choices.1.label',
    );
  });

  it('rejects a followup missing its prompt, at the followup element path', async () => {
    const p = clone(validPayload);
    delete p.setting.rounds[0].followupQuestions[0].prompt;
    const paths = leafPaths(await errorsFor(p));
    expect(paths).toContain('setting.rounds.0.followupQuestions.0.prompt');
  });

  it('rejects an invalid requiredVoteFilter, at the round element path', async () => {
    const p = clone(validPayload);
    p.setting.rounds[0].requiredVoteFilter = 'sideways';
    const paths = leafPaths(await errorsFor(p));
    expect(paths).toContain('setting.rounds.0.requiredVoteFilter');
  });

  it('rejects an option missing its optionName, at the option element path', async () => {
    const p = clone(validPayload);
    delete p.options[0].optionName;
    const paths = leafPaths(await errorsFor(p));
    expect(paths).toContain('options.0.optionName');
  });
});
