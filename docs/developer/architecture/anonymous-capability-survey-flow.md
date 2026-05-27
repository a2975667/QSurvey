Anonymous Capability Survey Flow
================================

This document defines how anonymous survey distribution, response identity, and participant-visible results should work. It is the canonical model for `uuid`, `sKey`, and `uKey`.

## Overview

QSurvey uses an anonymous capability-based workflow:

- `uKey` is an invitation / uniqueness key distributed by researchers to participants. It lets a participant submit without login and prevents duplicate participation when the survey requires unique keys.
- `sKey` is a session / group key distributed by researchers to a group, cohort, classroom, session, or treatment arm. It assigns a response to a result scope.
- `uuid` is a system-generated response instance key. It represents one `SurveyResponse` over time and lets the same anonymous participant continue, complete, and later look up that response.

These keys are not equivalent. `sKey` and `uKey` are entry/distribution credentials. `uuid` is the durable response identity after a `SurveyResponse` exists.

## Key Files

- `server/src/response/schemas/surveyResponse.schema.ts` — stores `uuid`, `uKey`, `sKey`, `surveyId`, `status`, and `questionResponses` on the response aggregate.
- `server/src/response/user-response.controller.ts` — public respondent response endpoints.
- `server/src/response/user-response.service.ts` — creates, updates, completes, and reads respondent `SurveyResponse` records.
- `server/src/surveys/surveys.service.ts` — computes aggregate results from `SurveyResponses` and `QuestionResponses`.
- `client/src/pages/survey/SurveyView.tsx` — respondent survey-taking entry.
- `client/src/pages/survey/components/SurveyCompletePage.tsx` — post-submit completion page.
- `client/src/pages/survey/components/SubmittedResultsSection.tsx` — participant completed-results UI.

## Domain Model

`SurveyResponse` is the aggregate root for anonymous participation. Once it exists, server code should prefer the stored response context over caller-supplied keys.

Conceptual shape:

```ts
type ParticipantResponseContext = {
  surveyId: string;
  surveyResponseId: string;
  uuid: string;
  status: 'Incomplete' | 'Complete';
  sKey?: string;
  uKey?: string;
  answeredQuestionIds: string[];
};
```

The context answers three separate questions:

- `uuid`: which response instance is this?
- `uKey`: which invitation / unique participant key created this response?
- `sKey`: which group/session aggregate scope does this response belong to?

## Lifecycle

1. Researcher distributes a survey link with optional `sKey` and/or `uKey`.
2. Participant submits an answer or batch of answers.
3. Backend validates entry credentials against survey settings:
   - `sKey` must match when the survey requires a static/session key.
   - `uKey` must be present and unused when the survey requires a unique key.
4. Backend creates a `SurveyResponse` with:
   - generated `uuid`;
   - stored `sKey`;
   - stored `uKey`;
   - `surveyId`;
   - `status: "Incomplete"`;
   - answered `questionResponses`.
5. Later writes use `uuid` to identify the same response. If write-time policy still requires extra protection, validate against the stored response values, but do not reinterpret `sKey` as a new scope.
6. Completion marks the same `SurveyResponse` as `Complete`.
7. Participant completed-results endpoints may use `uuid` as a bearer capability only after `status === "Complete"`.
8. Participant results derive `sKey`, `uKey`, and answered question mapping from the stored `SurveyResponse`.

## Endpoint Contracts

### Survey Taking / Entry

`GET /api/v1/surveys/:surveyId?sKey=...&uKey=...`

Purpose: load a live survey for taking/resuming.

Rules:
- May require `sKey` and/or `uKey` according to survey settings.
- May reject closed/unavailable surveys.
- Should not be used as a completed-results metadata source.

### Response Writes

`POST /api/v1/survey/responses`

Purpose: create the response or submit/update one answer.

Rules:
- Without `uuid`, validate `sKey`/`uKey` as entry credentials and create `SurveyResponse`.
- With `uuid`, load the existing `SurveyResponse` and validate against the stored context.
- Store `sKey` and `uKey` on the response when creating it.

`POST /api/v1/survey/responses/batch`

Purpose: create or update multiple answer records for the same response.

Rules:
- Same context rules as single-answer writes.
- Text block questions are non-answerable and should not create answer records.

`PUT /api/v1/survey/responses/complete`

Purpose: mark the response complete.

Rules:
- Load the `SurveyResponse`.
- Validate it belongs to the survey and is still incomplete.
- Mark `status: "Complete"` and clear expiry.
- Completion is the gate that allows participant completed-results lookup.

### Participant Completed Results

`GET /api/v1/survey/responses/:uuid?surveyId=...`

Purpose: read the participant's own completed response snapshot.

Rules:
- Load response by `uuid`.
- Ensure it belongs to `surveyId`.
- Ensure `status === "Complete"`.
- Enforce survey-level participant-results visibility.
- Return only the participant's own response snapshot.
- Do not require participant `sKey` or `uKey` query params.

`GET /api/v1/survey/responses/:uuid/results/questions?surveyId=...`

Purpose: return the completed-results dropdown catalog for this response.

Rules:
- Use the shared completed participant context resolver.
- Return only questions that:
  - were answered by this response;
  - still belong to the survey;
  - are supported participant-results types;
  - currently have participant results enabled.
- Return minimal display metadata such as `questionId`, label, type, and position.
- Do not call live survey-loading logic.

`GET /api/v1/survey/responses/:uuid/results?surveyId=...&questionId=...`

Purpose: return participant-visible aggregate results for one answered question.

Rules:
- Use the shared completed participant context resolver.
- Reject incomplete responses.
- Reject unanswered question ids even if they belong to the survey.
- Reject unsupported or participant-disabled questions.
- Use the stored response `sKey` as the aggregate scope when present.
- Do not accept participant `sKey` or `uKey` as query authority.

### Designer Results

`GET /api/v1/protected/surveys/:surveyId/results?questionId=...`

Purpose: authenticated designer/collaborator aggregate results.

Rules:
- Uses auth/collaborator authorization, not participant `uuid`.
- May support explicit designer filters such as status, date, and group/session scope.
- Designer group filters are separate from participant completed-results authorization.

## MVC / Service Boundaries

Controllers should:
- parse route/query/body inputs;
- call one service method per use case;
- not duplicate key semantics.

Response service should:
- own participant response lifecycle;
- resolve `ParticipantResponseContext`;
- enforce completed-response and participant-results authorization;
- expose lean use-case methods for snapshot, dropdown catalog, and participant aggregate access.

Surveys/results service should:
- compute aggregate result payloads;
- accept explicit, typed result scopes;
- not decide whether a participant UUID is authorized.

Frontend should:
- use `sKey`/`uKey` only for survey entry/taking flows;
- use `uuid` + `surveyId` for participant completed-results flows;
- not fetch live survey metadata to build completed-results dropdowns;
- treat backend completed-results endpoints as the source of truth.

## Anti-Patterns

- Passing `sKey`/`uKey` through participant completed-results URLs after a response exists.
- Calling live `GET /surveys/:surveyId` to build completed-results dropdowns.
- Letting `/results?questionId=...` return aggregates for questions not answered by the UUID's response.
- Letting aggregation use caller-supplied `sKey` instead of stored response `sKey`.
- Spreading `uuid`, `sKey`, and `uKey` validation across endpoints instead of resolving one response context.

## Endpoint Vetting Checklist

For every public respondent endpoint, answer:

- Is this before or after `SurveyResponse` creation?
- If before creation, are `sKey` and `uKey` entry credentials?
- If after creation, are `sKey` and `uKey` derived from stored `SurveyResponse`?
- Does the endpoint require `status === "Complete"`?
- Does it need the answered question mapping?
- Does it need aggregate scope, and if so is it using stored `sKey`?
- Is the controller thin and the service method named for the use case?
- Is participant authorization separate from designer/admin authorization?
