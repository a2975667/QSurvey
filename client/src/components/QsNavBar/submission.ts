import {
  submitInitialQuestionResponse,
  submitAdditionalQuestionResponse,
  updateQuestionResponse,
  completeSurveyResponse,
} from "../../features/options/api/options.api";
import { AppDispatch } from "../../app/store";
import { UnifiedResponsesState, QvQuestionState } from "../../types/responseTypes";
import { buildQuestionSubmission } from "../../utils/submissionBuilder";
import { recordQuestionResponseId } from "../../features/unifiedResponsesSlice";
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

  const navigatorSnapshot = (() => {
    const nav = unifiedState.qvNavigator;
    if (!nav || !Array.isArray(nav.order) || nav.order.length === 0) {
      return undefined;
    }
    const order = nav.order.filter((id) => typeof id === 'string' && id.length > 0);
    if (!order.length) return undefined;
    const completedArray = Object.entries(nav.completed || {})
      .filter(([, value]) => Boolean(value))
      .map(([questionId]) => questionId);
    const snapshot: {
      order: string[];
      activeQuestionId?: string;
      completed?: string[];
    } = {
      order,
    };
    if (typeof nav.activeQuestionId === 'string' && nav.activeQuestionId.length > 0) {
      snapshot.activeQuestionId = nav.activeQuestionId;
    }
    if (completedArray.length) {
      snapshot.completed = Array.from(new Set(completedArray));
    }
    return snapshot;
  })();

  const basePayload = {
    surveyId,
    questionId,
    responseContent: submission.responseContent,
    sKey: metadata.sKey || undefined,
    uKey: metadata.uKey || undefined,
    navigator: navigatorSnapshot,
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
