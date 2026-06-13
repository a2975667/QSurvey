import {
  formatQvVote,
  makeDefaultQvLabelOverrides,
  normalizeSurveyLocale,
  reseedQvLabelOverridesForLocale,
  resolveQvLabels,
} from './qvLabels';

describe('qvLabels', () => {
  it('normalizes unsupported locales to en-US', () => {
    expect(normalizeSurveyLocale(undefined)).toBe('en-US');
    expect(normalizeSurveyLocale('fr-FR')).toBe('en-US');
    expect(normalizeSurveyLocale('zh-TW')).toBe('zh-TW');
  });

  it('resolves zh-TW defaults and Quadratic Survey copy', () => {
    const labels = resolveQvLabels('zh-TW');

    expect(labels.text.quadraticSurvey).toBe('平方問卷');
    expect(labels.aliases.sortByVotes).toBe('依票數排序');
    expect(labels.aliases.binLabels.Undecided).toBe('尚未決定');
  });

  it('lets non-empty overrides beat locale defaults', () => {
    const labels = resolveQvLabels('zh-TW', {
      votePositive: '加分',
      binLabels: { Positive: '想要' },
    });

    expect(labels.aliases.votePositive).toBe('加分');
    expect(labels.aliases.binLabels.Positive).toBe('想要');
    expect(labels.aliases.binLabels.Negative).toBe('負向');
  });

  it('lets a non-empty leanPrefix override beat the locale default, but trims empties away', () => {
    expect(resolveQvLabels('zh-TW', { leanPrefix: '傾向' }).aliases.leanPrefix).toBe('傾向');
    // empty / whitespace falls back to the locale default
    expect(resolveQvLabels('zh-TW', { leanPrefix: '   ' }).aliases.leanPrefix).toBe('偏向');
    expect(resolveQvLabels('en-US', {}).aliases.leanPrefix).toBe('Lean');
  });

  it('re-seeds leanPrefix on locale change but preserves a custom value', () => {
    // an untouched default re-seeds to the new locale's default
    const fromDefault = reseedQvLabelOverridesForLocale(
      makeDefaultQvLabelOverrides('en-US'),
      'zh-TW',
      'en-US',
    );
    expect(fromDefault.leanPrefix).toBe('偏向');

    // a custom value survives the locale change
    const fromCustom = reseedQvLabelOverridesForLocale(
      { ...makeDefaultQvLabelOverrides('en-US'), leanPrefix: 'Tilt' },
      'zh-TW',
      'en-US',
    );
    expect(fromCustom.leanPrefix).toBe('Tilt');
  });

  it('formats English plural votes without forcing zh-TW plural behavior', () => {
    expect(formatQvVote(2, resolveQvLabels('en-US').aliases)).toBe('2 upvotes');
    expect(formatQvVote(-1, resolveQvLabels('en-US').aliases)).toBe('1 downvote');
    expect(formatQvVote(2, resolveQvLabels('zh-TW').aliases)).toBe('2 支持票');
    expect(formatQvVote(0, resolveQvLabels('zh-TW').aliases)).toBe('未投票');
  });

  it('re-seeds default aliases on locale changes but preserves custom aliases', () => {
    const current = {
      ...makeDefaultQvLabelOverrides('en-US'),
      votePositive: 'Support points',
    };
    const reseeded = reseedQvLabelOverridesForLocale(current, 'zh-TW', 'en-US');

    expect(reseeded.votePositive).toBe('Support points');
    expect(reseeded.voteNegative).toBe('反對票');
    expect(reseeded.binLabels?.Positive).toBe('正向');
  });

  it('preserves custom aliases that match defaults from another locale', () => {
    const current = {
      ...makeDefaultQvLabelOverrides('en-US'),
      votePositive: '支持票',
      binLabels: {
        ...makeDefaultQvLabelOverrides('en-US').binLabels,
        Positive: '正向',
      },
    };

    const reseeded = reseedQvLabelOverridesForLocale(current, 'zh-TW', 'en-US');

    expect(reseeded.votePositive).toBe('支持票');
    expect(reseeded.voteNegative).toBe('反對票');
    expect(reseeded.binLabels?.Positive).toBe('正向');
    expect(reseeded.binLabels?.Neutral).toBe('中立');
  });
});
