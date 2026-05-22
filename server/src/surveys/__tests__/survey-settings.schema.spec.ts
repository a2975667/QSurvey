import { SurveySettingsSchema } from '../schemas/surveySettings.schema';
import { model, models } from 'mongoose';

const getSurveySettingsModel = () =>
  models.SurveySettingsLegacyResultsVisibilityTest ||
  model('SurveySettingsLegacyResultsVisibilityTest', SurveySettingsSchema);

describe('SurveySettings schema', () => {
  it('does not force missing participant results fields off for legacy survey settings', () => {
    expect(
      SurveySettingsSchema.path('respondentsCanViewResults').options.default,
    ).toBeUndefined();

    const SurveySettingsModel = getSurveySettingsModel();
    const settings = SurveySettingsModel.hydrate({ hasUKey: false });

    expect(settings.respondentsCanViewResults).toBeUndefined();
    expect(settings.toObject()).not.toHaveProperty(
      'respondentsCanViewResults',
    );
  });

  it('stores survey locale only when explicitly provided', () => {
    const SurveySettingsModel = getSurveySettingsModel();
    const legacySettings = SurveySettingsModel.hydrate({ hasUKey: false });
    const localizedSettings = SurveySettingsModel.hydrate({
      hasUKey: false,
      locale: 'zh-TW',
    });

    expect(legacySettings.locale).toBeUndefined();
    expect(legacySettings.toObject()).not.toHaveProperty('locale');
    expect(localizedSettings.locale).toBe('zh-TW');
  });
});
