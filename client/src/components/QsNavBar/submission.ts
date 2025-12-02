import {
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse,
} from "../../features/options/api/options.api";
import { AppDispatch } from "../../app/store";
import { UnifiedResponsesState, QvQuestionState, ApprovalQuestionState } from "../../types/responseTypes";
import { buildQuestionSubmission } from "../../utils/submissionBuilder";
import {
  recordQuestionResponseId,
  syncApprovalNavigator,
  syncQvNavigator,
} from "../../features/unifiedResponsesSlice";
import { getTelemetrySummaryAndReset } from "../../telemetry/aggregator";

export interface SubmitQvQuestionArgs {
  dispatch: AppDispatch;
  questionId: string;
  qvState: QvQuestionState;
  unifiedState: UnifiedResponsesState;
  metadata: {
    surveyId?: string | null;
    sKey?: string | null;
    uKey?: string | null;
  };
}

export interface SubmitQvQuestionResult {
  surveyResponseId?: string;
  uuid?: string;
  questionResponseId?: string;
}

export interface SubmitApprovalQuestionArgs {
  dispatch: AppDispatch;
  questionId: string;
  approvalState: ApprovalQuestionState;
  unifiedState: UnifiedResponsesState;
  metadata: {
    surveyId?: string | null;
    sKey?: string | null;
    uKey?: string | null;
  };
}

export interface SubmitApprovalQuestionResult {
  surveyResponseId?: string;
  uuid?: string;
  questionResponseId?: string;
}

export const submitApprovalQuestion = async ({
  dispatch,
  questionId,
  approvalState,
  unifiedState,
  metadata,
}: SubmitApprovalQuestionArgs): Promise<SubmitApprovalQuestionResult> => {
  const surveyId = metadata.surveyId;
  if (!surveyId) {
    throw new Error("Survey ID is missing");
  }

  const submission = buildQuestionSubmission(questionId, approvalState);
  if (!submission || submission.type !== 'approval') {
    throw new Error("Unable to build approval submission payload");
  }

  const { navigatorForPayload, orderForSync, completedMapForSync, nextActiveForSync } = (() => {
    const nav = unifiedState.approvalNavigator;
    const order = Array.isArray(nav?.order)
      ? nav.order.filter((id) => typeof id === 'string' && id.length > 0)
      : [];
    const completedMap: Record<string, boolean> = { ...(nav?.completed || {}) };
    if (order.includes(questionId)) {
      completedMap[questionId] = true;
    }
    const allDone = order.length > 0 && order.every((id) => !!completedMap[id]);
    const nextActive = allDone ? undefined : order.find((id) => !completedMap[id]);

    const completedArray = Object.keys(completedMap).filter((id) => completedMap[id]);
    const snapshot: {
      order: string[];
      activeQuestionId?: string;
      completed?: string[];
    } = { order };
    if (!allDone && typeof nextActive === 'string' && nextActive.length > 0) {
      snapshot.activeQuestionId = nextActive;
    }
    if (completedArray.length) snapshot.completed = Array.from(new Set(completedArray));
    return {
      navigatorForPayload: snapshot,
      orderForSync: order,
      completedMapForSync: completedMap,
      nextActiveForSync: nextActive,
    };
  })();

  const basePayload = {
    surveyId,
    questionId,
    responseContent: submission.responseContent,
    sKey: metadata.sKey || undefined,
    uKey: metadata.uKey || undefined,
    navigator: navigatorForPayload,
  };

  const surveyResponseId = unifiedState.surveyResponseId;
  const surveyUuid = unifiedState.uuid;
  const existingQuestionResponseId = unifiedState.questionResponseIds?.[questionId];

  if (!surveyResponseId) {
    const result = await dispatch(
      submitInitialQuestionResponse({
        ...basePayload,
        IsNewSurveyResponse: true,
      }),
    );

    if (!submitInitialQuestionResponse.fulfilled.match(result)) {
      const message = (result as any)?.payload?.message || 'Failed to submit initial response';
      throw new Error(message);
    }

    const payload = result.payload || {};
    const surveyResponse = payload.surveyResponse;
    const questionResponse = payload.questionResponse;

    if (questionResponse?._id) {
      dispatch(
        recordQuestionResponseId({
          questionId,
          questionResponseId: questionResponse._id,
          surveyResponseId: surveyResponse?._id,
        }),
      );
    }

    dispatch(
      syncApprovalNavigator({
        order: orderForSync,
        completed: completedMapForSync,
        activeQuestionId: nextActiveForSync,
      } as any),
    );

    return {
      surveyResponseId: surveyResponse?._id,
      uuid: surveyResponse?.uuid,
      questionResponseId: questionResponse?._id,
    };
  }

  if (!existingQuestionResponseId) {
    if (!surveyUuid) {
      throw new Error('Survey UUID is missing for additional submission');
    }

    const result = await dispatch(
      submitAdditionalQuestionResponse({
        ...basePayload,
        uuid: surveyUuid,
        surveyResponseId,
      }),
    );

    if (!submitAdditionalQuestionResponse.fulfilled.match(result)) {
      const message = (result as any)?.payload?.message || 'Failed to submit additional response';
      throw new Error(message);
    }

    const questionResponse = (result.payload || {}).questionResponse;
    if (questionResponse?._id) {
      dispatch(
        recordQuestionResponseId({
          questionId,
          questionResponseId: questionResponse._id,
          surveyResponseId,
        }),
      );
    }

    dispatch(
      syncApprovalNavigator({
        order: orderForSync,
        completed: completedMapForSync,
        activeQuestionId: nextActiveForSync,
      } as any),
    );

    return {
      surveyResponseId,
      uuid: surveyUuid,
      questionResponseId: questionResponse?._id,
    };
  }

  if (!surveyUuid) {
    throw new Error('Survey UUID is missing for update submission');
  }

  const updateResult = await dispatch(
    updateQuestionResponse({
      ...basePayload,
      uuid: surveyUuid,
      surveyResponseId,
      questionResponseId: existingQuestionResponseId,
    }),
  );

  if (!updateQuestionResponse.fulfilled.match(updateResult)) {
    const message = (updateResult as any)?.payload?.message || 'Failed to update response';
    throw new Error(message);
  }

  dispatch(
    syncApprovalNavigator({
      order: orderForSync,
      completed: completedMapForSync,
      activeQuestionId: nextActiveForSync,
    } as any),
  );

  return {
    surveyResponseId,
    uuid: surveyUuid,
    questionResponseId: existingQuestionResponseId,
  };
};

export const submitQvQuestion = async ({
  dispatch,
  questionId,
  qvState,
  unifiedState,
  metadata,
}: SubmitQvQuestionArgs): Promise<SubmitQvQuestionResult> => {
  const surveyId = metadata.surveyId;
  if (!surveyId) {
    throw new Error("Survey ID is missing");
  }

  const submission = buildQuestionSubmission(questionId, qvState);
  if (!submission || submission.type !== 'qv') {
    throw new Error("Unable to build QV submission payload");
  }

  // Compute post-submit navigator and sync it before sending the payload
  const { navigatorForPayload, orderForSync, completedMapForSync, nextActiveForSync } = (() => {
    const nav = unifiedState.qvNavigator;
    const order = Array.isArray(nav?.order)
      ? nav.order.filter((id) => typeof id === 'string' && id.length > 0)
      : [];
    const completedMap: Record<string, boolean> = { ...(nav?.completed || {}) };
    if (order.includes(questionId)) {
      completedMap[questionId] = true;
    }
    const allDone = order.length > 0 && order.every((id) => !!completedMap[id]);
    const nextActive = allDone ? undefined : order.find((id) => !completedMap[id]);

    const completedArray = Object.keys(completedMap).filter((id) => completedMap[id]);
    const snapshot: {
      order: string[];
      activeQuestionId?: string;
      completed?: string[];
    } = { order };
    if (!allDone && typeof nextActive === 'string' && nextActive.length > 0) {
      snapshot.activeQuestionId = nextActive;
    }
    if (completedArray.length) snapshot.completed = Array.from(new Set(completedArray));
    return {
      navigatorForPayload: snapshot,
      orderForSync: order,
      completedMapForSync: completedMap,
      nextActiveForSync: nextActive,
    };
  })();

  const basePayload = {
    surveyId,
    questionId,
    responseContent: submission.responseContent,
    sKey: metadata.sKey || undefined,
    uKey: metadata.uKey || undefined,
    navigator: navigatorForPayload,
  };

  const surveyResponseId = unifiedState.surveyResponseId;
  const surveyUuid = unifiedState.uuid;
  const existingQuestionResponseId = unifiedState.questionResponseIds?.[questionId];

  if (!surveyResponseId) {
    const result = await dispatch(
      submitInitialQuestionResponse({
        ...basePayload,
        IsNewSurveyResponse: true,
      }),
    );

    if (!submitInitialQuestionResponse.fulfilled.match(result)) {
      const message = (result as any)?.payload?.message || 'Failed to submit initial response';
      throw new Error(message);
    }

    const payload = result.payload || {};
    const surveyResponse = payload.surveyResponse;
    const questionResponse = payload.questionResponse;

    if (questionResponse?._id) {
      dispatch(
        recordQuestionResponseId({
          questionId,
          questionResponseId: questionResponse._id,
          surveyResponseId: surveyResponse?._id,
        }),
      );
    }

    // Sync navigator post-submit (store reflects next-state)
    dispatch(
      syncQvNavigator({
        order: orderForSync,
        completed: completedMapForSync,
        activeQuestionId: nextActiveForSync,
      } as any),
    );

    return {
      surveyResponseId: surveyResponse?._id,
      uuid: surveyResponse?.uuid,
      questionResponseId: questionResponse?._id,
    };
  }

  if (!existingQuestionResponseId) {
    if (!surveyUuid) {
      throw new Error('Survey UUID is missing for additional submission');
    }

    const result = await dispatch(
      submitAdditionalQuestionResponse({
        ...basePayload,
        uuid: surveyUuid,
        surveyResponseId,
      }),
    );

    if (!submitAdditionalQuestionResponse.fulfilled.match(result)) {
      const message = (result as any)?.payload?.message || 'Failed to submit additional response';
      throw new Error(message);
    }

    const questionResponse = (result.payload || {}).questionResponse;
    if (questionResponse?._id) {
      dispatch(
        recordQuestionResponseId({
          questionId,
          questionResponseId: questionResponse._id,
          surveyResponseId,
        }),
      );
    }

    // Sync navigator post-submit
    dispatch(
      syncQvNavigator({
        order: orderForSync,
        completed: completedMapForSync,
        activeQuestionId: nextActiveForSync,
      } as any),
    );

    return {
      surveyResponseId,
      uuid: surveyUuid,
      questionResponseId: questionResponse?._id,
    };
  }

  if (!surveyUuid) {
    throw new Error('Survey UUID is missing for update submission');
  }

  const updateResult = await dispatch(
    updateQuestionResponse({
      ...basePayload,
      uuid: surveyUuid,
      surveyResponseId,
      questionResponseId: existingQuestionResponseId,
    }),
  );

  if (!updateQuestionResponse.fulfilled.match(updateResult)) {
    const message = (updateResult as any)?.payload?.message || 'Failed to update response';
    throw new Error(message);
  }

  // Sync navigator post-submit
  dispatch(
    syncQvNavigator({
      order: orderForSync,
      completed: completedMapForSync,
      activeQuestionId: nextActiveForSync,
    } as any),
  );

  return {
    surveyResponseId,
    uuid: surveyUuid,
    questionResponseId: existingQuestionResponseId,
  };
};

export interface CompleteSurveyArgs {
  dispatch: AppDispatch;
  surveyId: string;
  surveyResponseId: string;
  uuid: string;
  metadata?: any;
  sKey?: string | null;
  uKey?: string | null;
}

export const completeSurveySubmission = async ({
  dispatch,
  surveyId,
  surveyResponseId,
  uuid,
  metadata,
  sKey,
  uKey,
}: CompleteSurveyArgs) => {
  const telemetrySummary = getTelemetrySummaryAndReset();
  const meta = metadata ? { ...metadata } : {};
  (meta as any).eventSummary = telemetrySummary;
  const result = await dispatch(
    completeSurveyResponse({
      surveyId,
      surveyResponseId,
      uuid,
      metadata: meta,
      sKey: sKey || undefined,
      uKey: uKey || undefined,
    }),
  );

  if (!completeSurveyResponse.fulfilled.match(result)) {
    const payload = (result as any)?.payload;
    const message = (payload as any)?.message || 'Failed to complete survey';
    const error: any = new Error(message);
    if (payload && typeof payload === 'object') {
      if ('code' in payload) error.code = (payload as any).code;
      if ('status' in payload) error.status = (payload as any).status;
    }
    throw error;
  }
};
