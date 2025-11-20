import { QUESTIONS_COLLECTION } from '../schemas/constants';
import { QuestionSchema } from '../schemas/question.schema';
import { LikertQuestionSchema } from '../schemas/likert/likert.question.schema';
import { TextInputQuestionSchema } from '../schemas/textInput/text-input.question.schema';
import { QVQuestionSchema } from '../schemas/qv/qv-question.schema';
import { ApprovalQuestionSchema } from '../schemas/approval/approval-question.schema';

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
});
