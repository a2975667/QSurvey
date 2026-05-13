import { SurveySettingsSchema } from '../schemas/surveySettings.schema';

describe('SurveySettings schema', () => {
  it('defaults new surveys to participant results disabled', () => {
    expect(
      SurveySettingsSchema.path('respondentsCanViewResults').options.default,
    ).toBe(false);
  });
});
