import { OptionIdService } from './option-id.service';

describe('OptionIdService', () => {
  let service: OptionIdService;

  beforeEach(() => {
    service = new OptionIdService();
  });

  it('keeps non-ASCII option names stable', () => {
    const options: Array<{
      optionName: string;
      description: string;
      optionId?: string;
    }> = [{ optionName: '\u4f60\u597d\u4e16\u754c', description: '' }];

    service.generateOptionIds(options);

    expect(options[0].optionId).toBe('\u4f60\u597d\u4e16\u754c');
  });

  it('dedupes duplicate option names with suffixes', () => {
    const options: Array<{
      optionName: string;
      description: string;
      optionId?: string;
    }> = [
      { optionName: 'Alpha', description: '' },
      { optionName: 'Alpha', description: '' },
    ];

    service.generateOptionIds(options);

    expect(options[0].optionId).toBe('alpha');
    expect(options[1].optionId).toBe('alpha-2');
  });

  it('preserves existing optionIds and avoids collisions for new ones', () => {
    const options: Array<{
      optionName: string;
      description: string;
      optionId?: string;
    }> = [
      { optionId: 'keep_me', optionName: 'Original', description: '' },
      { optionName: 'Keep me', description: '' },
    ];

    service.generateOptionIds(options);

    expect(options[0].optionId).toBe('keep_me');
    expect(options[1].optionId).toBe('keep_me-2');
  });

  it('caps long optionIds and appends a hash', () => {
    const longName = 'A'.repeat(120);
    const options: Array<{
      optionName: string;
      description: string;
      optionId?: string;
    }> = [{ optionName: longName, description: '' }];

    service.generateOptionIds(options);

    const optionId = options[0].optionId || '';
    expect(optionId.length).toBeLessThanOrEqual(48);
    expect(optionId).toMatch(/-[a-f0-9]{6}$/);
  });

  it('falls back to a hash when the slug is empty', () => {
    const options: Array<{
      optionName: string;
      description: string;
      optionId?: string;
    }> = [{ optionName: '!!!', description: '' }];

    service.generateOptionIds(options);

    expect(options[0].optionId).toMatch(/^opt-[a-f0-9]{6}$/);
  });

  it('throws when unique option ids exceed the safety cap', () => {
    const options: Array<{
      optionName: string;
      description: string;
      optionId?: string;
    }> = [{ optionName: 'Alpha', description: '', optionId: 'alpha' }];
    for (let i = 2; i <= 1001; i += 1) {
      options.push({
        optionName: 'Alpha',
        description: '',
        optionId: `alpha-${i}`,
      });
    }
    options.push({ optionName: 'Alpha', description: '' });

    expect(() => service.generateOptionIds(options)).toThrow(
      'Unable to generate unique optionId',
    );
  });
});
