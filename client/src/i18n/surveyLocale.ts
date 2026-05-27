export type SurveyLocale = 'en-US' | 'zh-TW';

export const DEFAULT_SURVEY_LOCALE: SurveyLocale = 'en-US';
export const SUPPORTED_SURVEY_LOCALES: SurveyLocale[] = ['en-US', 'zh-TW'];

export const normalizeSurveyLocale = (raw: unknown): SurveyLocale => {
  return SUPPORTED_SURVEY_LOCALES.includes(raw as SurveyLocale)
    ? (raw as SurveyLocale)
    : DEFAULT_SURVEY_LOCALE;
};
