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
});
