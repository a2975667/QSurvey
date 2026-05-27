const SURVEY_TEMPLATE_ID_VALUES = [
  '6a023b1ada049d7ebee72017',
  '680f38261354f9f2000e5db8',
  '69764360249947669eb93cf8',
] as const;

export const normalizeSurveyTemplateId = (surveyId: string): string =>
  surveyId.trim().toLowerCase();

export const SURVEY_TEMPLATE_IDS = new Set<string>(
  SURVEY_TEMPLATE_ID_VALUES.map(normalizeSurveyTemplateId),
);

export const isSurveyTemplateId = (surveyId: string): boolean =>
  SURVEY_TEMPLATE_IDS.has(normalizeSurveyTemplateId(surveyId));
