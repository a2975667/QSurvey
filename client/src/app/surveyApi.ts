import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_PREFIX } from '../config';
import { IBackendSurvey } from '../types/backendTypes';

interface SurveySettingsPayload {
  hasSKey: boolean;
  sKeyValue?: string;
  hasUKey: boolean;
  isAvailable: boolean;
  respondentsCanViewResults?: boolean;
  locale?: 'en-US' | 'zh-TW';
}

interface CreateSurveyPayload {
  title: string;
  description: string;
  settings: SurveySettingsPayload;
}

interface UpdateSurveyPayload {
  surveyId: string;
  body: Partial<CreateSurveyPayload>;
}

interface UpdateSurveyPagesPayload {
  surveyId: string;
  pages: any;
}

interface SurveyPageMutationPayload {
  surveyId: string;
  pageId?: string;
  body?: any;
}

interface ReorderSurveyPagesPayload {
  surveyId: string;
  order: string[];
}

interface QuestionMutationPayload {
  surveyId: string;
  questionId?: string;
  type: 'qv' | 'likert' | 'text' | 'selection';
  body: any;
}

interface SubmitNonQvResponsesPayload {
  surveyId: string;
  body: any;
}

export const surveyApi = createApi({
  reducerPath: 'surveyApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_PREFIX, credentials: 'include' }),
  tagTypes: ['Survey', 'SurveyResponse'],
  endpoints: (builder) => ({
    listOwnedSurveys: builder.query<IBackendSurvey[], void>({
      query: () => '/surveys',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Survey' as const, id: _id })),
              { type: 'Survey' as const, id: 'LIST' },
            ]
          : [{ type: 'Survey' as const, id: 'LIST' }],
    }),
    getSurveyForOwner: builder.query<IBackendSurvey, string>({
      query: (surveyId) => `/surveys/${surveyId}/owner`,
      providesTags: (result, error, id) => [{ type: 'Survey', id }],
    }),
    getSurvey: builder.query<IBackendSurvey, string>({
      query: (surveyId) => `/surveys/${surveyId}`,
      providesTags: (result, error, id) => [{ type: 'Survey', id }],
    }),
    createSurvey: builder.mutation<IBackendSurvey, CreateSurveyPayload>({
      query: (body) => ({
        url: '/surveys',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Survey', id: 'LIST' }],
    }),
    updateSurvey: builder.mutation<IBackendSurvey, UpdateSurveyPayload>({
      query: ({ surveyId, body }) => ({
        url: `/surveys/${surveyId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { surveyId }) => [
        { type: 'Survey', id: surveyId },
        { type: 'Survey', id: 'LIST' },
      ],
    }),
    updateSurveyPages: builder.mutation<IBackendSurvey, UpdateSurveyPagesPayload>({
      query: ({ surveyId, pages }) => ({
        url: `/surveys/${surveyId}/pages`,
        method: 'PUT',
        body: { pages },
      }),
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    addSurveyPage: builder.mutation<IBackendSurvey, SurveyPageMutationPayload>({
      query: ({ surveyId, body }) => ({
        url: `/surveys/${surveyId}/pages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    updateSurveyPage: builder.mutation<IBackendSurvey, SurveyPageMutationPayload>({
      query: ({ surveyId, pageId, body }) => ({
        url: `/surveys/${surveyId}/pages/${pageId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    deleteSurveyPage: builder.mutation<IBackendSurvey, SurveyPageMutationPayload>({
      query: ({ surveyId, pageId }) => ({
        url: `/surveys/${surveyId}/pages/${pageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    reorderSurveyPages: builder.mutation<IBackendSurvey, ReorderSurveyPagesPayload>({
      query: ({ surveyId, order }) => ({
        url: `/surveys/${surveyId}/pages/reorder`,
        method: 'PUT',
        body: { order },
      }),
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    saveQuestion: builder.mutation<any, QuestionMutationPayload>({
      query: ({ surveyId, questionId, type, body }) => {
        if (questionId) {
          return {
            url: `/questions/${questionId}`,
            method: 'PUT',
            body: { ...body, surveyId },
          };
        }
        return {
          url: `/questions/${type}`,
          method: 'POST',
          body: { ...body, surveyId },
        };
      },
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    deleteQuestion: builder.mutation<void, { surveyId: string; questionId: string }>({
      query: ({ questionId }) => ({
        url: `/questions/${questionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { surveyId }) => [{ type: 'Survey', id: surveyId }],
    }),
    // Response endpoints are defined here for future migration
    getSurveyResponseByUUID: builder.query<any, { uuid: string; surveyId: string; sKey?: string; uKey?: string }>(
      {
        query: ({ uuid, surveyId, sKey, uKey }) => {
          const params = new URLSearchParams();
          params.set('uuid', uuid);
          params.set('surveyId', surveyId);
          if (sKey) params.set('sKey', sKey);
          if (uKey) params.set('uKey', uKey);
          return { url: `/survey/responses?${params.toString()}` };
        },
        providesTags: (result, error, args) => [{ type: 'SurveyResponse', id: args.uuid }],
      }
    ),
    createInitialResponse: builder.mutation<any, { surveyId: string; questionId: string; responseContent: any; sKey?: string; uKey?: string }>(
      {
        query: (body) => ({
          url: `/survey/responses`,
          method: 'POST',
          body: { IsNewSurveyResponse: true, ...body },
        }),
        invalidatesTags: (result, error, body) => [{ type: 'Survey', id: body.surveyId }],
      }
    ),
    addQuestionResponse: builder.mutation<any, { uuid: string; surveyResponseId: string; surveyId: string; questionId: string; responseContent: any; sKey?: string; uKey?: string }>(
      {
        query: (body) => ({ url: `/survey/responses`, method: 'POST', body }),
        invalidatesTags: (result, error, body) => [{ type: 'SurveyResponse', id: body.uuid }],
      }
    ),
    updateQuestionResponse: builder.mutation<any, { uuid: string; surveyResponseId: string; questionResponseId: string; surveyId: string; questionId: string; responseContent: any; sKey?: string; uKey?: string }>(
      {
        query: (body) => ({ url: `/survey/responses`, method: 'PUT', body }),
        invalidatesTags: (result, error, body) => [{ type: 'SurveyResponse', id: body.uuid }],
      }
    ),
    completeSurveyResponse: builder.mutation<any, { uuid: string; surveyResponseId: string; surveyId: string; sKey?: string; uKey?: string; metadata?: any }>(
      {
        query: (body) => ({ url: `/survey/responses/complete`, method: 'PUT', body }),
        invalidatesTags: (result, error, body) => [{ type: 'SurveyResponse', id: body.uuid }],
      }
    ),
    submitNonQvResponses: builder.mutation<any, SubmitNonQvResponsesPayload>({
      query: ({ surveyId, body }) => ({
        url: `/response/${surveyId}`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useListOwnedSurveysQuery,
  useGetSurveyForOwnerQuery,
  useGetSurveyQuery,
  useCreateSurveyMutation,
  useUpdateSurveyMutation,
  useUpdateSurveyPagesMutation,
  useAddSurveyPageMutation,
  useUpdateSurveyPageMutation,
  useDeleteSurveyPageMutation,
  useReorderSurveyPagesMutation,
  useSaveQuestionMutation,
  useDeleteQuestionMutation,
  useGetSurveyResponseByUUIDQuery,
  useCreateInitialResponseMutation,
  useAddQuestionResponseMutation,
  useUpdateQuestionResponseMutation,
  useCompleteSurveyResponseMutation,
  useSubmitNonQvResponsesMutation,
} = surveyApi;
