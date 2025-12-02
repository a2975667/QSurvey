import { QuestionResponseState, UnifiedResponsesState } from '../types/responseTypes';

export type QuestionSubmission = {
  questionId: string;
  responseContent: any;
  type: 'qv' | 'likert' | 'text' | 'approval';
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
      const orderedOptions = Object.values(questionState.options || {}).sort(
        (a, b) => (a.globalPosition ?? 0) - (b.globalPosition ?? 0),
      );

      const votes = orderedOptions.map((option) => ({
        optionId: option.optionId,
        optionName: option.optionName,
        group: option.group,
        groupPosition: option.groupPosition,
        votes: option.votes,
      }));

      const groupMap: Record<string, string> = {};
      const positionMap: Record<string, number> = {};

      orderedOptions.forEach((option) => {
        if (option.optionId) {
          if (typeof option.group === 'string') {
            groupMap[option.optionId] = option.group;
          }
          if (typeof option.globalPosition === 'number') {
            positionMap[option.optionId] = option.globalPosition;
          }
        }
      });

      const bins = questionState.bins || {
        hasUndecided: true,
        hasSkip: true,
        userDefined: [],
      };

      const categoriesOrder = Array.isArray(questionState.categoriesOrder)
        ? [...questionState.categoriesOrder]
        : [];

      return {
        questionId,
        type: 'qv',
        responseContent: {
          totalCredits: questionState.totalCredits,
          votes,
          group: groupMap,
          position: positionMap,
          bins: {
            hasUndecided: Boolean(bins.hasUndecided),
            hasSkip: Boolean(bins.hasSkip),
            userDefined: Array.isArray(bins.userDefined)
              ? [...bins.userDefined]
              : [],
          },
          categoriesOrder,
        },
      };
    }
    case 'approval': {
      const approvals = Array.isArray(questionState.approvals)
        ? questionState.approvals.filter((id) => typeof id === 'string' && id.length > 0)
        : [];
      return {
        questionId,
        type: 'approval',
        responseContent: {
          approvals,
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
    if (!submission || submission.type === 'qv' || submission.type === 'approval') {
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
