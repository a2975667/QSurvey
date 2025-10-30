import { QuestionResponseState, UnifiedResponsesState } from '../types/responseTypes';

export type QuestionSubmission = {
  questionId: string;
  responseContent: any;
  type: 'qv' | 'likert' | 'text';
};

export type NonQvBatchBuildResult = {
  responses: Array<{ questionId: string; responseContent: any }>;
  unanswered: string[];
};

export function buildQuestionSubmission(
  questionId: string,
  questionState: QuestionResponseState,
): QuestionSubmission | undefined {
  switch (questionState.type) {
    case 'likert': {
      if (!questionState.selection) {
        return undefined;
      }
      return {
        questionId,
        type: 'likert',
        responseContent: {
          selection: questionState.selection,
          ...(questionState.optionName ? { optionName: questionState.optionName } : {}),
        },
      };
    }
    case 'text': {
      const text = questionState.text ?? '';
      if (!text.trim()) {
        return undefined;
      }
      return {
        questionId,
        type: 'text',
        responseContent: { text },
      };
    }
    case 'qv': {
      const votes = Object.values(questionState.options || {})
        .sort((a, b) => a.globalPosition - b.globalPosition)
        .map((option) => ({
          optionId: option.optionId,
          optionName: option.optionName,
          group: option.group,
          groupPosition: option.groupPosition,
          votes: option.votes,
        }));
      return {
        questionId,
        type: 'qv',
        responseContent: {
          totalCredits: questionState.totalCredits,
          votes,
        },
      };
    }
    default:
      return undefined;
  }
}

export function buildNonQvBatchPayload(params: {
  unifiedState: UnifiedResponsesState;
  questionIds: string[];
}): NonQvBatchBuildResult {
  const { unifiedState, questionIds } = params;
  const responses: Array<{ questionId: string; responseContent: any }> = [];
  const unanswered: string[] = [];

  questionIds.forEach((questionId) => {
    const state = unifiedState.byQuestionId?.[questionId];
    if (!state) {
      unanswered.push(questionId);
      return;
    }
    const submission = buildQuestionSubmission(questionId, state);
    if (!submission || submission.type === 'qv') {
      // We only batch likert/text here; treat lack of submission as unanswered
      if (!submission) unanswered.push(questionId);
      return;
    }
    responses.push({ questionId: submission.questionId, responseContent: submission.responseContent });
  });

  // Deterministic ordering by questionId
  responses.sort((a, b) => a.questionId.localeCompare(b.questionId));

  return { responses, unanswered };
}

