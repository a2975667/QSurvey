import {
  DEFAULT_SURVEY_LOCALE,
  normalizeSurveyLocale,
  SurveyLocale,
} from './surveyLocale';
import {
  QvStaticLabels,
  RESPONDENT_STATIC_LABELS_BY_LOCALE,
} from './respondentLabels';

export type QvCanonicalBin =
  | 'Positive'
  | 'Neutral'
  | 'Negative'
  | 'Undecided'
  | 'Skip';

export interface QvLabelOverrides {
  binLabels?: Partial<Record<QvCanonicalBin, string>>;
  leanPrefix?: string;
  votePositive?: string;
  voteNegative?: string;
  voteNone?: string;
  sortByVotes?: string;
}

export interface QvAliases {
  binLabels: Record<QvCanonicalBin, string>;
  leanPrefix: string;
  votePositive: string;
  voteNegative: string;
  voteNone: string;
  sortByVotes: string;
}

export interface ResolvedQvLabels {
  locale: SurveyLocale;
  aliases: QvAliases;
  text: QvStaticLabels;
}

export const QV_CANONICAL_BINS: QvCanonicalBin[] = [
  'Positive',
  'Neutral',
  'Negative',
  'Undecided',
  'Skip',
];

export const DEFAULT_QV_ALIASES_BY_LOCALE: Record<SurveyLocale, QvAliases> = {
  'en-US': {
    binLabels: {
      Positive: 'Positive',
      Neutral: 'Neutral',
      Negative: 'Negative',
      Undecided: 'Undecided',
      Skip: 'Skip',
    },
    leanPrefix: 'Lean',
    votePositive: 'upvote',
    voteNegative: 'downvote',
    voteNone: 'No votes',
    sortByVotes: 'Sort by Votes',
  },
  'zh-TW': {
    binLabels: {
      Positive: '正向',
      Neutral: '中立',
      Negative: '負向',
      Undecided: '尚未決定',
      Skip: '暫時略過',
    },
    leanPrefix: '偏向',
    votePositive: '支持票',
    voteNegative: '反對票',
    voteNone: '未投票',
    sortByVotes: '依票數排序',
  },
};

const trimToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveQvLabels = (
  localeInput?: unknown,
  overrides?: QvLabelOverrides,
): ResolvedQvLabels => {
  const locale = normalizeSurveyLocale(localeInput);
  const defaults = DEFAULT_QV_ALIASES_BY_LOCALE[locale];
  const enDefaults = DEFAULT_QV_ALIASES_BY_LOCALE[DEFAULT_SURVEY_LOCALE];

  const binLabels = QV_CANONICAL_BINS.reduce(
    (acc, binId) => {
      acc[binId] =
        trimToUndefined(overrides?.binLabels?.[binId]) ||
        defaults.binLabels[binId] ||
        enDefaults.binLabels[binId];
      return acc;
    },
    {} as Record<QvCanonicalBin, string>,
  );

  return {
    locale,
    aliases: {
      binLabels,
      leanPrefix:
        trimToUndefined(overrides?.leanPrefix) ||
        defaults.leanPrefix ||
        enDefaults.leanPrefix,
      votePositive:
        trimToUndefined(overrides?.votePositive) ||
        defaults.votePositive ||
        enDefaults.votePositive,
      voteNegative:
        trimToUndefined(overrides?.voteNegative) ||
        defaults.voteNegative ||
        enDefaults.voteNegative,
      voteNone:
        trimToUndefined(overrides?.voteNone) ||
        defaults.voteNone ||
        enDefaults.voteNone,
      sortByVotes:
        trimToUndefined(overrides?.sortByVotes) ||
        defaults.sortByVotes ||
        enDefaults.sortByVotes,
    },
    text:
      RESPONDENT_STATIC_LABELS_BY_LOCALE[locale] ||
      RESPONDENT_STATIC_LABELS_BY_LOCALE[DEFAULT_SURVEY_LOCALE],
  };
};

export const formatQvVote = (value: number, labels: QvAliases): string => {
  if (value > 0) {
    const unit = labels.votePositive;
    return value === 1 && unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].votePositive
      ? `1 ${unit}`
      : `${value} ${unit}${unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].votePositive && value !== 1 ? 's' : ''}`;
  }
  if (value < 0) {
    const count = Math.abs(value);
    const unit = labels.voteNegative;
    return count === 1 && unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].voteNegative
      ? `1 ${unit}`
      : `${count} ${unit}${unit === DEFAULT_QV_ALIASES_BY_LOCALE['en-US'].voteNegative && count !== 1 ? 's' : ''}`;
  }
  return labels.voteNone;
};

export const getQvBinLabel = (binId: string, labels: QvAliases): string => {
  return labels.binLabels[binId as QvCanonicalBin] || binId;
};

export const makeDefaultQvLabelOverrides = (
  localeInput?: unknown,
): QvLabelOverrides => {
  const locale = normalizeSurveyLocale(localeInput);
  const defaults = DEFAULT_QV_ALIASES_BY_LOCALE[locale];
  return {
    binLabels: { ...defaults.binLabels },
    leanPrefix: defaults.leanPrefix,
    votePositive: defaults.votePositive,
    voteNegative: defaults.voteNegative,
    voteNone: defaults.voteNone,
    sortByVotes: defaults.sortByVotes,
  };
};

const shouldUseLocaleDefault = (
  currentValue: unknown,
  previousDefaultValue: string,
): boolean => {
  const trimmed = trimToUndefined(currentValue);
  return !trimmed || trimmed === previousDefaultValue;
};

export const reseedQvLabelOverridesForLocale = (
  current: QvLabelOverrides | undefined,
  nextLocaleInput: unknown,
  previousLocaleInput: unknown = DEFAULT_SURVEY_LOCALE,
): QvLabelOverrides => {
  const nextLocale = normalizeSurveyLocale(nextLocaleInput);
  const previousLocale = normalizeSurveyLocale(previousLocaleInput);
  const next = makeDefaultQvLabelOverrides(nextLocale);
  if (!current) return next;

  const previous = DEFAULT_QV_ALIASES_BY_LOCALE[previousLocale];
  const binLabels = QV_CANONICAL_BINS.reduce(
    (acc, binId) => {
      const currentValue = current.binLabels?.[binId];
      acc[binId] = shouldUseLocaleDefault(currentValue, previous.binLabels[binId])
        ? next.binLabels?.[binId]
        : currentValue;
      return acc;
    },
    {} as Partial<Record<QvCanonicalBin, string>>,
  );

  return {
    binLabels,
    leanPrefix: shouldUseLocaleDefault(current.leanPrefix, previous.leanPrefix)
      ? next.leanPrefix
      : current.leanPrefix,
    votePositive: shouldUseLocaleDefault(current.votePositive, previous.votePositive)
      ? next.votePositive
      : current.votePositive,
    voteNegative: shouldUseLocaleDefault(current.voteNegative, previous.voteNegative)
      ? next.voteNegative
      : current.voteNegative,
    voteNone: shouldUseLocaleDefault(current.voteNone, previous.voteNone)
      ? next.voteNone
      : current.voteNone,
    sortByVotes: shouldUseLocaleDefault(current.sortByVotes, previous.sortByVotes)
      ? next.sortByVotes
      : current.sortByVotes,
  };
};
