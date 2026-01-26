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
  approvalNavigator: {
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

  it('builds selection submission payload', () => {
    const state = {
      ...BASE_STATE,
      byQuestionId: {
        selection: {
          type: 'selection' as const,
          questionId: 'selection',
          selectedOptionIds: ['optA', 'optB'],
        },
      },
    } as any;

    const submission = buildQuestionSubmission('selection', state.byQuestionId.selection!);
    expect(submission?.type).toBe('selection');
    expect(submission?.responseContent.selectedOptionIds).toEqual(['optA', 'optB']);
  });

  it('builds QV submission payload with placement metadata', () => {
    const state: UnifiedResponsesState = {
      ...BASE_STATE,
      byQuestionId: {
        qv1: {
          type: 'qv',
          questionId: 'qv1',
          totalCredits: 12,
          bins: { hasUndecided: true, hasSkip: true, userDefined: ['Positive', 'Negative'] },
          categoriesOrder: ['Undecided', 'Positive', 'Negative', 'Skip'],
          options: {
            a: {
              optionId: 'a',
              optionName: 'Alpha',
              group: 'Positive',
              groupPosition: 0,
              globalPosition: 1,
              votes: 3,
            },
            b: {
              optionId: 'b',
              optionName: 'Beta',
              group: 'Negative',
              groupPosition: 0,
              globalPosition: 2,
              votes: -1,
            },
          },
          positionsByGroup: {
            Undecided: [],
            Positive: ['a'],
            Negative: ['b'],
            Skip: [],
          },
          history: { revision: 2 },
        },
      },
    } as any;

    const submission = buildQuestionSubmission('qv1', state.byQuestionId.qv1!);
    expect(submission?.type).toBe('qv');
    expect(submission?.responseContent.totalCredits).toBe(12);
    expect(submission?.responseContent.group).toEqual({ a: 'Positive', b: 'Negative' });
    expect(submission?.responseContent.position).toEqual({ a: 1, b: 2 });
    expect(submission?.responseContent.bins).toEqual({
      hasUndecided: true,
      hasSkip: true,
      userDefined: ['Positive', 'Negative'],
    });
    expect(submission?.responseContent.categoriesOrder).toEqual([
      'Undecided',
      'Positive',
      'Negative',
      'Skip',
    ]);
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
