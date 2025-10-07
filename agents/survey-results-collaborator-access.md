# Feature Design: Collaborator‑Only Survey Results (MVP)

## Overview

Enable survey collaborators to view primitive results for a specific question within a survey they collaborate on. Access is enforced strictly by collaborator membership (or Admin). The MVP focuses on QV‑type questions and returns both aggregated totals and a raw vote list to support verification and debugging.

## Goals

- Only collaborators (or Admin) can view results for a survey.
- For a `(surveyId, questionId)` pair, compute per‑option vote totals and a grand total.
- Return raw rows (respondent identifier, responseId, optionId, vote, timestamp) for audits.
- Provide a minimal web UI to render totals and raw rows (paged).

## Non‑Goals (Phase 1)

- Rich analytics (filters, time trends, segmentation).
- Non‑QV question types (Likert/Text) aggregation.
- Advanced visualizations beyond simple tables.
- Cross‑survey question reuse de‑duplication beyond explicit `(surveyId, questionId)`.

## Success Metrics

- Correctness: Aggregates exactly match database totals (spot‑check ≥3 surveys, 0 mismatches).
- Security: 0 unauthorized accesses (403 enforced for non‑collaborators).
- Latency: p95 < 400ms for 10k QuestionResponses; p95 < 150ms for 1k.
- Stability: 99.9% endpoint success over 7 days; no unhandled exceptions.
- Adoption: ≥50% of collaborators open results at least once in week 1 (internal signal).

## Personas & Stories

- Collaborator (Designer)
  - As a collaborator, I need the total votes per option for a question in my survey.
  - As a collaborator, I need raw rows to debug anomalies.
- Admin
  - As an admin, I can view results for any survey for support/troubleshooting.

## Data Model Notes

- `QuestionResponses` (collection: `QuestionResponses`)
  - `surveyResponseId:ObjectId`
  - `questionId:ObjectId`
  - `responseContent.ResponseTypeQV.votes:[{ optionId, optionName, votes }]`
  - `createdTime:Date`
- `SurveyResponses` (collection: `SurveyResponses`)
  - `_id`, `surveyId:ObjectId`, `status`, `uuid`, `uKey`, `questionResponses:[ObjectId]`, timestamps
- `Surveys`
  - `collaborators:[ObjectId(User)]` — canonical for editor/reader permissions

Respondent identifier in raw rows uses `uuid` (or `uKey` fallback). No PII is exposed.

### Storage clarification (based on code review)
- `SurveyResponses` are created via `user-response.service` with fields: `_id`, `surveyId`, `uuid`, optional `uKey`/`sKey`, timestamps, `status` (defaults to `Incomplete`, set to `Complete` by `markSurveyResponseAsCompleted`), and `questionResponses` (array of `QuestionResponse` ObjectIds).
- `QuestionResponses` are created first for the initial question on a survey; they may lack a `surveyResponseId` at creation. Subsequent question answers add `surveyResponseId`. Each response stores `questionId`, `responseContent.ResponseTypeQV.votes`, `createdTime`, `expireCountdown`.
- Safe aggregation path: start from `SurveyResponses` filtered by `surveyId` + `status: 'Complete'`, unwind `questionResponses`, join `QuestionResponses`, filter by `questionId`, then aggregate votes. This guarantees we only include responses tied to the survey even if some `QuestionResponse` documents lack a back-reference.
- `surveyId` in `SurveyResponses` is stored as a string (not `ObjectId`) in current production data, so queries must match on the literal string value.

### Deprecation notice: `Survey.responses`
- The `responses` array on `Surveys` is not used by the results feature and is not necessary for reliable aggregation.
- New code MUST NOT read or write `Survey.responses`.
- Canonical linkage for results and analytics is: `SurveyResponses (by surveyId, status)` → `questionResponses[]` → `QuestionResponses (by questionId)`.
- Plan: treat `Survey.responses` as legacy; avoid referencing it in APIs; schedule retirement once no code depends on it.

## Permissions & Security

- Guard: `JwtAuthGuard` + `RolesGuard`
- Authorization: Admin OR collaborator (userId ∈ survey.collaborators)
- Validate `(surveyId, questionId)` pair: ensure question responses belong to `surveyId`

## API Design (MVP)

- `GET /api/v1/protected/surveys/:surveyId/results?questionId=<ObjectId>&status=Completed|All&limit=100&cursor=<opaque>`
  - AuthZ: collaborator on `surveyId` OR Admin
  - Default `status=Completed`, `limit=100 (max 1000)`
  - Response:
    ```json
    {
      "meta": {
        "surveyId": "...",
        "questionId": "...",
        "optionTotals": [ { "optionId": "optA", "optionName": "A", "sum": 7 } ],
        "grandTotal": 14,
        "counts": { "responses": 6, "votes": 12, "statusFilter": "Completed" }
      },
      "raw": [
        { "respondentId": "<uuid|uKey>", "responseId": "...", "optionId": "optA", "vote": -2, "at": "2025-10-07T01:22:11Z" }
      ],
      "nextCursor": null
    }
    ```

## Aggregation Logic (QV)

Pipeline outline (MongoDB):

1) Match `QuestionResponses.questionId = :questionId`
2) Lookup `SurveyResponses` by `surveyResponseId` → `sr`
3) Filter `sr.surveyId = :surveyId` and `sr.status` per `status` param (default Completed)
4) Unwind `responseContent.votes`
5) Group by `votes.optionId` with `{ $sum: 'votes.votes' }`, collect `optionName` (first)
6) Compute grand total as sum of per‑option sums (in app or via `$group` + `$group`)
7) For raw rows, map each `votes` element to `{ respondentId: sr.uuid || sr.uKey, responseId: sr._id, optionId, vote, at: createdTime }`, then paginate

Indexes:
- `QuestionResponses`: `{ questionId: 1 }`
- `SurveyResponses`: `{ surveyId: 1 }`
- Optional compound: `{ questionId: 1, surveyResponseId: 1 }`

### Sample aggregate (survey `680f38261354f9f2000e5db8`, question `680f39a41354f9f2000e5dd2`)
```
[
  { _id: 'yokohama_japan', optionName: 'Yokohama, Japan', totalVotes: 47 },
  { _id: 'honolulu_hawaii_usa', optionName: 'Honolulu, Hawaiʻi, USA', totalVotes: 37 },
  { _id: 'hamburg_germany', optionName: 'Hamburg, Germany', totalVotes: 8 },
  { _id: 'new_orleans_louisiana_usa', optionName: 'New Orleans, Louisiana, USA', totalVotes: 33 },
  { _id: 'virtual', optionName: 'Virtual', totalVotes: -12 },
  { _id: 'glasgow_scotland_uk', optionName: 'Glasgow, Scotland, UK', totalVotes: 42 },
  { _id: 'montral_qubec_canada', optionName: 'Montréal, Québec, Canada', totalVotes: 36 },
  { _id: 'paris_france', optionName: 'Paris, France', totalVotes: 31 },
  { _id: 'austin_texas_usa', optionName: 'Austin, Texas, USA', totalVotes: 13 }
]
Grand total: 235.
```

Raw rows for the same query include `uuid`/`uKey`, `responseId`, each option vote (positive/negative), and `createdTime`.

## Frontend MVP

- Route: `/designer/results/:surveyId?questionId=<id>`
- Page: `SurveyResultsPage`
  - Fetches results endpoint with auth token
  - Renders:
    - Totals table: `Option | Sum`
    - Grand Total
    - Raw table: `Respondent | ResponseId | OptionId | Vote | Timestamp` with “Load more”
  - Link from Survey Edit/Questions list: “View Results” button per question

## Acceptance Criteria

- Access control: collaborators/Admin only; non‑collaborators receive 403
- Aggregates equal manual sums on tested surveys
- Empty state: “No responses yet” when none
- Latency within targets; no unhandled exceptions on malformed inputs

## Observability

- Logs: userId, surveyId, questionId, matched response/vote counts, response time; warn on mismatched survey/question
- Metrics: requests, errors (by code), latency percentiles

## Security & Privacy

- No PII in results; respondentId is `uuid`/`uKey`
- Rate‑limit endpoint (future), and consider optional `maskRespondents=true`

## Rollout Plan

1) Backend endpoint + auth + aggregation
2) Minimal UI page + link from Survey Edit
3) Internal validation + spot checks
4) Add CSV export and filters in follow-ups

## Testing Strategy

- **Backend aggregation tests**
  - Unit test the aggregation service with fixtures mirroring the sample survey to confirm totals (e.g., Yokohama 47).
  - Tests for empty data (no SurveyResponses) and mixed positive/negative votes.
  - Authorization tests: collaborator vs non-collaborator vs admin.
  - Validate string `surveyId` handling in queries.
- **API integration tests**
  - Hit the results endpoint with mocked Mongo layer to ensure payload shape matches spec (`meta`, `raw`).
  - Ensure 403 for unauthorized users and 400 for invalid ObjectIds.
- **Frontend**
  - Component tests verifying totals table and raw table render given mock API payload.
  - Snapshot/interaction test for “Load more” button placeholder (even without pagination yet).

---

## Implementation Checklist

Backend
- [ ] Add controller: `GET /api/v1/protected/surveys/:surveyId/results`
- [ ] Guard route with `JwtAuthGuard` + `RolesGuard`
- [ ] AuthZ: load survey and ensure `req.user.userId ∈ survey.collaborators` or Admin
- [ ] Validate params: `surveyId`, `questionId` are valid ObjectIds; optional `status`, `limit`, `cursor`
- [ ] Implement Mongo aggregation pipeline (QV) per logic above
- [ ] Return `{ meta, raw, nextCursor }` payload shape
- [ ] Add indexes if missing (`QuestionResponses.questionId`, `SurveyResponses.surveyId`)
- [ ] Add structured logs and basic metrics counters
- [ ] Unit/integration tests for authz and aggregation edge cases (no responses, negative votes, large payloads)

Frontend
- [ ] Create `SurveyResultsPage` route and component
- [ ] Fetch results with auth token, handle pagination
- [ ] Render totals and grand total table
- [ ] Render raw rows table with “Load more”
- [ ] Link from Survey Edit/Question list → “View Results”
- [ ] Empty/Loading/Error states

Operational
- [ ] Verify access control by attempting as non‑collaborator (expect 403)
- [ ] Spot‑check aggregates vs DB for 3+ surveys
- [ ] Monitor logs/metrics for errors and latency after release
