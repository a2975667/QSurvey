# Results Views (Creator & Submitter) — Decomposition and Plan

This document outlines the work plan to deliver the “Creator Results” and “Submitter Results” experiences, identifies current server/client capabilities, flags gaps, and defines milestones and acceptance checks. It does not specify UI interactions (MoveVis governs that).

## Objectives
- Keep existing routes and contracts unless explicitly extended.
- Add visualization to the Creator results page alongside existing tables.
- Add a Submitted view for participants showing their actual submitted data and group aggregates.
- Honor the “snapshot at submission time” rule for the submitter view.
- Provide dev-only debug surfaces (respondent IDs, numeric tables).

## Current Capabilities (Confirmed)
- Creator route: `/designer/results/:surveyId` (auth-protected). client/src/App.tsx:175
- Baseline Creator rendering and fetching: client/src/pages/designer/SurveyResultsPage.tsx
  - GET `${API_PREFIX}/protected/surveys/:surveyId/results?questionId=...&limit=50[&cursor=…]` with Bearer token.
  - Shows summary, per-option totals, and raw votes with pagination.
  - Honors `X-New-Access-Token` for JWT refresh.
- Backend results endpoint: server/src/surveys/protected-surveys.controller.ts:51
  - Response: `meta{ surveyId, questionId, optionTotals[{optionId, optionName, sum}], grandTotal, counts{responses, votes, statusFilter} }`, `raw[{respondentId, responseId, optionId, vote, at}]`, `nextCursor`.
  - Status filter: default `Complete`; supports `status=All`.
- Submission APIs (public): server/src/response/user-response.controller.ts under `api/v1/survey/responses`
  - Create/update question responses, complete survey.
  - Fetch existing by UUID endpoint exists as `GET /api/v1/survey/responses`, but controller currently uses `@Body()` for GET instead of `@Query()` (mismatch vs client usage at client/src/features/options/api/options.api.ts:23–46).

## Gaps (Submitter Data + Snapshot)
- No public API to fetch a participant’s own completed submission by `uuid` (current `getIncompleteSurveyResponseByUUID` forbids status `Complete`: server/src/core/core-logic.service.ts: validateUUIDAvaliable).
- Results aggregation endpoint has no “as-of submission time” filter. Current pipelines compute totals over all matching responses and do not constrain by time for the totals pipeline.
- MoveVis demo folder is not present in this repo. We will need the shell (or confirm path) to integrate.

## Approach Overview
- Creator Results: keep the current tabular baseline; add MoveVis visualization driven by the same results payload. Introduce a thin adapter to map `optionTotals` and `raw` into MoveVis’ expected structures. Keep route and auth.
- Submitter Results: enhance the existing “complete” experience to show a Submitted results module that merges:
  1) The submitter’s actual data loaded from DB (new endpoint), and
  2) Group aggregates from the existing results source, evaluated at the submitter’s submission time (new `asOf` filter or precomputed snapshot).
- Snapshot rule: use the `SurveyResponse.endTime` as the snapshot boundary for both raw and totals.
- Dev-only debug: gate respondent ID visibility and numeric tables behind a dev flag (client) and/or a `debug=true` query param (server optional).

## Detailed Decomposition

### 1) Backend — Submitter’s Own Data (Public)
Goal: Return the participant’s own final submission (read-only) by `uuid`, with validation using `sKey`/`uKey` when required.

- Add new route (public): `GET /api/v1/survey/responses/:uuid`
  - Query: `surveyId`, optional `sKey`, optional `uKey`.
  - Validation:
    - `surveyId` exists and matches the response.
    - If survey enforces `sKey`/`uKey`, enforce them via existing logic: `validateSurveySKey`, `validateSurveyResponseUKey`.
    - Allow status `Complete` (do NOT use `validateUUIDAvaliable`, which forbids completed). Create a new validator that permits completed.
  - Returns minimal, sanitized data needed for Submitted view:
    - `surveyResponseId`, `uuid`, `surveyId`, `endTime`.
    - `questionResponses`: array with at least `{ _id, questionId, createdTime, responseContent }` to reconstruct the submitter’s own votes (especially QV votes per option, with timestamps if present).
  - Security: no PII; data is already tied to a random `uuid` and optional `uKey`. Do not expose other respondents.
  - Note: Also update current `GET /api/v1/survey/responses` to use `@Query()` instead of `@Body()` for correctness, but Submitted view uses the new `/:uuid` route.

Alternative (if we want to avoid a new route): accept `status=Complete` in the existing GET, controlled by a distinct validator method. The explicit `/:uuid` route remains clearer.

### 2) Backend — Results “As Of” a Timestamp
Goal: Allow computing aggregates/rows up to a boundary time (submitter’s `endTime`).

- Extend `GET /api/v1/protected/surveys/:surveyId/results` with optional `asOf` (ISO timestamp) query param.
  - Validate timestamp; if provided, constrain ALL components (totals, counts, raw, cursor) to items with derived `at <= asOf`.
  - Pipeline changes:
    - For totals pipeline, introduce an `$addFields` (or earlier derivation) of `at` based on `questionResponse.createdTime || endTime || startTime`, then `$match` `at <= asOf` before `$group`.
    - For raw pipeline, reuse the current `at` derivation and add the `asOf` constraint alongside existing cursor filtering.
    - Counts (`responses`) must also apply the same `asOf` cut.
  - Cursor logic: keep ordering (`at`, `questionResponseId`, `voteIndex`) and maintain `nextCursor` semantics under the `asOf` constraint.

Alternative: snapshot aggregates at submission time (compute once during `completeSurveyResponse` and store into the `SurveyResponse` document). This trades runtime complexity for storage. The pipeline approach is preferred for consistency with existing code and avoids schema changes.

### 3) Client — Creator Results (existing route)
- Keep current tabular Summary, Option Totals, Raw Votes.
- Integrate MoveVis visualization (non-clustering views) next to or above tables for the selected `questionId`.
  - Source components from `move_vis/components/*` (e.g., `HistogramChart`, `ScatterPlot`). Do not install or use `installMockApi`; feed data via props.
  - Add a thin adapter `ResultsMoveVisAdapter` that maps server payloads to MoveVis props:
    - Option list: map `meta.optionTotals` to categorical series.
    - Raw events: map `raw[]` into arrays `{ id: respondentId, value: vote }` per option key and include timestamps for filtering.
  - Keep current auth and fetch logic. No change in server contract for Creator view.
- Dev-only (default ON in dev): keep respondent IDs visible (already in Raw table). Provide an env toggle (`REACT_APP_RESULTS_DEBUG`) to hide later without code changes.

- Placement: enhance `client/src/pages/survey/components/SurveyCompletePage.tsx` (route `/survey/:id/complete`) with a “See Results” toggle that reveals the Submitted results module inline under the thank-you text.
- Data flow on mount:
  1) Get `uuid`, `surveyResponseId`, and `surveyId` from Redux (`qsOptions.responseStatus`) or querystring fallback (the Complete flow already persists uuid/id during submission).
  2) Call new public endpoint `GET /api/v1/survey/responses/:uuid?surveyId=...&[sKey/uKey]` to load the submitter’s data (their `questionResponses`, `endTime`).
  3) For each supported questionId (initially the one the UI focuses on), call the results endpoint with `asOf=endTime` to fetch group aggregates and latest raw rows up to that time: `GET /api/v1/protected/surveys/:surveyId/results?questionId=...&asOf=...`.
- Rendering:
  - MoveVis visualization (non-clustering views) using the same adapter as Creator view.
  - Submitter’s own numeric table (their votes per option with timestamps) derived from their `questionResponses`.
  - Group aggregates numeric tables (option totals, grand total) from results response.
- Snapshot guarantee: only use the `asOf`-bounded results along with the submitter’s own frozen data; never subscribe or poll for updates in this view.
- Dev-only: show the submitter’s `respondentId` (uuid/uKey) and expose a “Show Debug” toggle to reveal both numeric tables and respondent IDs.

### 5) Debug/Dev-Only Gating
- Client gating: `REACT_APP_RESULTS_DEBUG=true` or `NODE_ENV !== 'production'` to render debug blocks:
  - Respondent IDs in both Creator and Submitter views (Creator already shows `respondentId` in raw table; keep and hide by default in prod builds).
  - Numeric tables for submitter’s own votes and group aggregates (Submitter view), and the existing Creator tables.
- Optional server gating: accept `debug=true` query to include additional diagnostics in responses; not required for this feature set.

## Milestones
1) Backend
- M1. Add `GET /api/v1/survey/responses/:uuid` (public) with validations and return shape described above.
- M2. Extend `GET /api/v1/protected/surveys/:surveyId/results` to accept `asOf` and apply filter to totals, counts, and raw pipelines.
- M3. Fix `GET /api/v1/survey/responses` to read `@Query()` (correctness; used by resume flow).
- M4. Unit tests for validators, `asOf` parsing, and pipeline filters.

2) Client
- M5. Wire Submitted results into `/survey/:id/complete` using new `/:uuid` endpoint + `asOf` results.
- M6. Integrate MoveVis components from `move_vis/components/*` (disable clustering views) for both Creator and Submitter via a shared adapter.
- M7. Add dev-only toggles for respondent IDs and numeric tables.
- M8. Smoke tests for routing and data adapters; update existing tests for SurveyResultsPage.

## Verification Steps
- Backend
  - A. `GET /api/v1/survey/responses/:uuid` returns the submitter’s completed data when correct `sKey/uKey` are provided and denies otherwise.
  - B. `GET /api/v1/protected/surveys/:surveyId/results?questionId=...&asOf=...` returns:
    - Totals/counts computed only from items with `at <= asOf`.
    - Raw rows bounded by `asOf` and properly paginated.
  - C. Existing results endpoint remains backward compatible without `asOf`.
  - D. Resume endpoint reads `@Query()` and works with existing client calls.

- Client
  - E. Creator Results page shows visualization and existing tables for a selected questionId.
  - F. Submitter ‘Submitted’ view (behind “See Results” toggle) shows the participant’s own votes (from DB) and group aggregates as-of submission.
  - G. Dev-only toggles reveal respondent IDs and both numeric tables.
  - H. No live updates occur in Submitted view; reloading retains snapshot (depends on uuid present).

## Endpoints Summary
- Creator aggregates (existing):
  - `GET /api/v1/protected/surveys/:surveyId/results?questionId=...&limit=...&cursor=...[&status=All|Complete][&asOf=ISO]` (extend with `asOf`).
- Submitter own data (new):
  - `GET /api/v1/survey/responses/:uuid?surveyId=...&[sKey=...]&[uKey=...]`.
- Resume incomplete response (fix):
  - `GET /api/v1/survey/responses?uuid=...&surveyId=...&[sKey=...]&[uKey=...]` should read `@Query()`.

## Snapshot Semantics
- Boundary: `SurveyResponse.endTime` (set at completion).
- Aggregates and raw rows must be computed with `at <= endTime` (where `at` is derived from `questionResponse.createdTime` or fallback order fields, consistent with current raw pipeline derivation).
- No polling or live updates in the Submitted view; navigate/refresh reproduces the same data for the same `uuid`.

## Dev/Debug Surfaces
- Creator: keep Raw table including `respondentId`; hide behind dev flag in production builds if desired.
- Submitter: show
  - Respondent ID (uuid/uKey) for the submitter.
  - Numeric table of the submitter’s option votes and timestamps.
  - Numeric table of group `optionTotals` and `grandTotal`.
- Gating: `REACT_APP_RESULTS_DEBUG=true` displays all debug blocks.

## Acceptance Checks (Aligned to End Requirements)
- Auth is still required for Creator results, route unchanged.
- Creator results page renders visualization + current tabular summary and raw votes for a selected `questionId`.
- Submitter ‘Submitted’ experience shows the participant’s actual data (from DB) and group aggregates derived from the existing results source.
- Snapshot rule: Submitted view displays data as of submission and does not change as new responses arrive.
- Debug/Dev-only: Both views can display respondent IDs and numeric tables; mechanism is gated and off in production.
- No demographics or clustering added.

## Clarifications Incorporated
- MoveVis location: `move_vis/` in repo root (Vite demo with `MoveVisApp.tsx`, `components/*`). We will import the chart components and bypass its mockApi in our integration.
- Submitted placement: add a “See Results” toggle on the existing thank-you page (`client/src/pages/survey/components/SurveyCompletePage.tsx`), rendering the Submitted results module inline when enabled.
- Access policy: Submitted results are retrievable without auth via `uuid` (+ `sKey`/`uKey` if configured). We will implement the public GET endpoint accordingly and ensure validations.
- Debug policy: show full respondent IDs and numeric tables in both views for now; no hashing required. We will keep an env toggle for future gating, but default to visible in development.
- Question types: Only support QV (aka QS) questions in both views. Non-QV questions will show a “not supported yet” notice.

Note on MoveVis features: We will integrate non-clustering views (e.g., histogram/dots) aligned with “No clustering” requirement. Any clustering (e.g., k-means compromise) is disabled in our integration.
