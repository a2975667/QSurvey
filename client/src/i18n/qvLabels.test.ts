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
