export const SURVEY_TEMPLATE_IDS = new Set<string>([
  '6a023b1ada049d7ebee72017',
  '680f38261354f9f2000e5db8',
  '69764360249947669eb93cf8',
]);

export const isSurveyTemplateId = (surveyId: string): boolean =>
  SURVEY_TEMPLATE_IDS.has(surveyId);
