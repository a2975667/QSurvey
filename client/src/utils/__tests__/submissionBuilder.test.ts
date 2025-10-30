import { UnifiedResponsesState } from '../../types/responseTypes';
import { buildNonQvBatchPayload, buildQuestionSubmission } from '../submissionBuilder';

const BASE_STATE: UnifiedResponsesState = {
  status: 'in_progress',
  error: undefined,
  surveyId: 'survey',
  surveyResponseId: null,
  uuid: 'uuid',
  questionResponseIds: {},
  byQuestionId: {},
  qvNavigator: {
    order: [],
    activeQuestionId: undefined,
    completed: {},
  },
  submitQueue: [],
};

describe('submissionBuilder', () => {
  it('builds likert submission payload', () => {
    const state = {
      ...BASE_STATE,
      byQuestionId: {
        likert: {
          type: 'likert' as const,
          questionId: 'likert',
          selection: '5',
          optionName: 'Strongly Agree',
          history: undefined,
        },
      },
    };

    const submission = buildQuestionSubmission('likert', state.byQuestionId.likert!);
    expect(submission?.type).toBe('likert');
    expect(submission?.responseContent.selection).toBe('5');
  });

  it('builds text submission payload', () => {
    const state = {
      ...BASE_STATE,
      byQuestionId: {
        text: {
          type: 'text' as const,
          questionId: 'text',
          text: 'Insightful response',
          history: undefined,
        },
      },
    };

    const submission = buildQuestionSubmission('text', state.byQuestionId.text!);
    expect(submission?.type).toBe('text');
    expect(submission?.responseContent.text).toBe('Insightful response');
  });

  it('returns unanswered list for missing entries', () => {
    const state: UnifiedResponsesState = {
      ...BASE_STATE,
      byQuestionId: {
        likert: {
          type: 'likert',
          questionId: 'likert',
          selection: '3',
          history: undefined,
        },
      },
    } as any;

    const { responses, unanswered } = buildNonQvBatchPayload({
      unifiedState: state,
      questionIds: ['likert', 'text'],
    });

    expect(responses).toHaveLength(1);
    expect(responses[0].questionId).toBe('likert');
    expect(unanswered).toContain('text');
  });

  it('sorts responses deterministically', () => {
    const state: UnifiedResponsesState = {
      ...BASE_STATE,
      byQuestionId: {
        b: {
          type: 'text',
          questionId: 'b',
          text: 'Second',
          history: undefined,
        },
        a: {
          type: 'likert',
          questionId: 'a',
          selection: '1',
          history: undefined,
        },
      },
    } as any;

    const { responses } = buildNonQvBatchPayload({
      unifiedState: state,
      questionIds: ['b', 'a'],
    });

    expect(responses.map((r) => r.questionId)).toEqual(['a', 'b']);
  });
});
