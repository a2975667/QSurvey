import { QUESTIONS_COLLECTION } from '../schemas/constants';
import { QuestionSchema } from '../schemas/question.schema';
import { LikertQuestionSchema } from '../schemas/likert/likert.question.schema';
import { TextInputQuestionSchema } from '../schemas/textInput/text-input.question.schema';
import { QVQuestionSchema } from '../schemas/qv/qv-question.schema';
import { ApprovalQuestionSchema } from '../schemas/approval/approval-question.schema';
import { model, models } from 'mongoose';

const getQuestionModel = () =>
  models.QuestionLegacyResultsVisibilityTest ||
  model('QuestionLegacyResultsVisibilityTest', QuestionSchema);

describe('Question schema collection configuration', () => {
  it('stores all question types in the shared questions collection', () => {
    const schemas = [
      QuestionSchema,
      LikertQuestionSchema,
      TextInputQuestionSchema,
      QVQuestionSchema,
      ApprovalQuestionSchema,
    ];

    schemas.forEach((schema) => {
      expect(schema.get('collection')).toBe(QUESTIONS_COLLECTION);
    });
  });

  it('does not force missing participant results fields off for legacy questions', () => {
    expect(
      QuestionSchema.path('respondentResultsEnabled').options.default,
    ).toBeUndefined();

    const QuestionModel = getQuestionModel();
    const question = QuestionModel.hydrate({ type: 'qv' });

    expect(question.respondentResultsEnabled).toBeUndefined();
    expect(question.toObject()).not.toHaveProperty('respondentResultsEnabled');
  });
});
