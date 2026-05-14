export type CanonicalQuestionType =
  | 'qv'
  | 'likert'
  | 'text'
  | 'text_block'
  | 'approval'
  | 'selection';

export const normalizeQuestionType = (raw?: string): string => {
  if (!raw) {
    return '';
  }
  const normalized = raw.toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'textblock') {
    return 'text_block';
  }
  if (normalized === 'textinput') {
    return 'text';
  }
  return normalized;
};

export const isParticipantResultsSupportedQuestionType = (raw?: string): boolean => {
  const normalized = normalizeQuestionType(raw);
  return (
    normalized === 'qv' ||
    normalized === 'qs' ||
    normalized === 'quadratic' ||
    normalized === 'likert' ||
    normalized === 'selection' ||
    normalized === 'approval'
  );
};

export const resolveQuestionType = (raw?: string): CanonicalQuestionType => {
  const normalized = normalizeQuestionType(raw);
  if (normalized === 'likert') return 'likert';
  if (normalized === 'text_block') return 'text_block';
  if (normalized === 'text') return 'text';
  if (normalized === 'approval') return 'approval';
  if (normalized === 'selection') return 'selection';
  // 'qs' and 'quadratic' are QV variants that canonicalize to 'qv'
  return 'qv';
};
