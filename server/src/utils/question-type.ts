export const normalizeQuestionType = (
  rawType?: string,
): string | undefined => {
  if (!rawType) {
    return undefined;
  }
  const normalized = rawType.toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'textblock') {
    return 'text_block';
  }
  return normalized;
};

export const detectQuestionType = (
  questionDoc: any,
  fallback?: string,
): string | undefined => {
  const explicitType = normalizeQuestionType(questionDoc?.type);
  const settingType = normalizeQuestionType(
    questionDoc?.setting?.questionType,
  );
  return explicitType || settingType || fallback;
};
