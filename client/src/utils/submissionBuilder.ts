import { QuestionResponseState, UnifiedResponsesState } from '../types/responseTypes';

export type QuestionSubmission = {
  questionId: string;
  responseContent: any;
  type: 'qv' | 'qvplus' | 'likert' | 'text' | 'approval' | 'selection';
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
    case 'qvplus': {
      // QV-shared portion (top-level fields). These mirror the 'qv' case above
      // and are derived from the live state — which, for QVPlus, equals the
      // final round's votes. Keeping them top-level lets QV-style aggregation
      // work unchanged; per-round detail is captured separately below.
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

      // Per-round vote snapshots. Each round's snapshot was frozen by
      // qvPlusStartNextRound on transition OUT of that round — which means the
      // active (last) round never gets one. Fall back to the live state so the
      // final round's votes are still captured. The fallback must match the
      // snapshot shape ({ options, positionsByGroup }) created by the reducer,
      // not the flattened top-level shape (votes/groupMap/positionMap) above.
      const livePositionsByGroup = (questionState as any).positionsByGroup ?? {};
      const rounds = Object.entries(questionState.rounds || {}).map(
        ([roundId, roundState]) => ({
          roundId,
          voteSnapshot: roundState.voteSnapshot ?? {
            options: questionState.options,
            positionsByGroup: livePositionsByGroup,
          },
        }),
      );

      // Flatten followupAnswers from the nested shape used in Redux
      //   rounds[roundId].followupAnswers[optionId][followupId] = choiceId | null
      // into a single array. Each entry carries roundId so the backend can
      // group and aggregate per-round without re-nesting.
      const followupAnswers: Array<{
        roundId: string;
        optionId: string;
        followupId: string;
        choiceId: string | null;
      }> = [];
      Object.entries(questionState.rounds || {}).forEach(
        ([roundId, roundState]) => {
          Object.entries(roundState.followupAnswers || {}).forEach(
            ([optionId, answers]) => {
              Object.entries(answers).forEach(([followupId, choiceId]) => {
                followupAnswers.push({
                  roundId,
                  optionId,
                  followupId,
                  choiceId,
                });
              });
            },
          );
        },
      );

      return {
        questionId,
        type: 'qvplus',
        responseContent: {
          // QV-shared fields
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
          // QVPlus-specific fields
          rounds,
          followupAnswers,
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
    case 'selection': {
      const selectedOptionIds = Array.isArray(questionState.selectedOptionIds)
        ? questionState.selectedOptionIds.filter(
            (id) => typeof id === 'string' && id.length > 0,
          )
        : [];
      if (!selectedOptionIds.length) {
        return undefined;
      }
      return {
        questionId,
        type: 'selection',
        responseContent: {
          selectedOptionIds,
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
      // We batch likert/text/selection here; treat lack of submission as unanswered
      if (!submission) unanswered.push(questionId);
      return;
    }
    responses.push({ questionId: submission.questionId, responseContent: submission.responseContent });
  });

  // Deterministic ordering by questionId
  responses.sort((a, b) => a.questionId.localeCompare(b.questionId));

  return { responses, unanswered };
}
