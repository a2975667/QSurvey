import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  isSurveyTemplateId,
  SURVEY_TEMPLATE_IDS,
} from './survey-template.config';

describe('survey template config', () => {
  it('normalizes template IDs before checking the allowlist', () => {
    expect(isSurveyTemplateId('  6A023B1ADA049D7EBEE72017  ')).toBe(true);
    expect(isSurveyTemplateId('000000000000000000000000')).toBe(false);
  });

  it('stays in sync with the client demo survey list', () => {
    const demoSurveysPath = resolve(
      __dirname,
      '../../..',
      'client/src/demoSurveys.ts',
    );
    const source = readFileSync(demoSurveysPath, 'utf8');
    const clientIds = new Set<string>();
    const idPattern = /id:\s*['"]([a-fA-F0-9]{24})['"]/g;
    let match = idPattern.exec(source);
    while (match) {
      clientIds.add(match[1].toLowerCase());
      match = idPattern.exec(source);
    }

    expect(clientIds).toEqual(SURVEY_TEMPLATE_IDS);
  });
});
