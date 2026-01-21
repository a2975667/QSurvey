export type CanonicalQuestionType =
  | 'qv'
  | 'likert'
  | 'text'
  | 'text_block'
  | 'approval';

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

export const resolveQuestionType = (raw?: string): CanonicalQuestionType => {
  const normalized = normalizeQuestionType(raw);
  if (normalized === 'likert') return 'likert';
  if (normalized === 'text_block') return 'text_block';
  if (normalized === 'text') return 'text';
  if (normalized === 'approval') return 'approval';
  return 'qv';
};
