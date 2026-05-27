Safari Submit Failure: QuotaExceeded Runbook
============================================

This document captures the failure mode where respondents can see submit failures and Safari console `QuotaExceededError`, plus the current telemetry safeguards and maintenance checks.

## Summary
- User-facing symptom: `Unable to submit responses. Please try again.`
- Browser console symptom (Safari): `QuotaExceededError: The quota has been exceeded.`
- Additional field reports: some participants experienced tab/browser crash during survey completion attempts.
- Severity: high for live survey sessions because it can block submission and risk data loss or participant drop-off.

## User-Facing Symptoms
1. Respondent completes survey interactions (often approval-heavy flow).
2. On submit or near submit, UI reports generic failure.
3. Safari console shows quota errors from frontend bundle execution.
4. In worse cases, browser tab becomes unstable (freeze/crash).

## Impact Scope
- Primary impacted path: frontend submission flow that depends on Redux dispatch.
- Most visible in approval sessions due to high interaction volume.
- Not limited to approval only; any long session with many dispatched actions can hit the same issue.
- Backend API can be healthy while frontend still fails before request completion.

## Historical Root Cause (Pre-Fix)

### 1) Legacy recorder middleware wrote unbounded data to localStorage
File: `client/src/components/Tracker/reduxRecorderMiddleware.jsx`

Historical behavior:
1. Records every Redux action.
2. Attaches large metadata to the action (`timestamp`, mouse metrics, deep state diff).
3. Appends action to an in-memory `eventRecords` array.
4. Persists full array on every dispatch:
   - `localStorage.setItem("eventRecords", JSON.stringify(eventRecords));`

Consequence:
- Storage grows without bound.
- Safari quota is exceeded.
- JSON serialization and repeated writes can heavily tax main thread.

### 2) Middleware was fail-closed on storage error
The historical catch path rethrew storage errors.

Consequence:
- `QuotaExceededError` escapes middleware.
- Redux dispatch chain can fail.
- Submit flow that depends on dispatch can fail with generic user-facing errors.

### 3) Middleware was globally enabled
File: `client/src/app/store.ts`

Historical behavior:
- `eventRecorderMiddleware` is concatenated into store middleware for all environments.

Consequence:
- All participants run this risk, not just development/test users.

### 4) Deep-diff and action mutation amplified cost
Files:
- `client/src/components/Tracker/reduxRecorderMiddleware.jsx`
- `client/src/components/Tracker/deepDiff.jsx`

Behavior:
- Computes deep state diff on each action.
- Mutates action object by adding telemetry payload.

Consequence:
- Extra CPU and memory pressure.
- Larger serialized payload persisted per action.

## Why Approval Voting Surfaced This First
Approval flow tends to generate many frequent dispatches:
- Toggle approval per option.
- Drag/reorder operations.
- Navigator sync and completion state updates.

This increases recorder write frequency and payload volume, causing quota and performance failure sooner than low-interaction flows.

## Why Pilot Likely Did Not Show It
Most probable contributors:
1. Lower session intensity and shorter interaction time in pilot.
2. Fewer approval-heavy runs with repeated reorder/toggle actions.
3. Different browser mix (less Safari share).
4. Smaller sample size reduced chance of hitting quota edge cases.

This is consistent with latent unbounded-storage bugs that only emerge at high interaction scale.

## Current Telemetry Architecture Reality

### Safe telemetry path already exists
Files:
- `client/src/telemetry/middleware.ts`
- `client/src/telemetry/aggregator.ts`

Behavior:
- Tracks compact event types in memory.
- Designed for summarization (`eventSummary`) rather than raw full-state logging.

### Legacy recorder is disabled by default
Files:
- `client/src/app/store.ts`
- `client/src/components/Tracker/reduxRecorderMiddleware.jsx`

Current behavior:
- The legacy recorder is only added when
  `REACT_APP_ENABLE_LEGACY_EVENT_RECORDER === "true"`.
- Default and production builds do not include it unless that build-time flag is
  explicitly set.
- The current recorder uses bounded buffers (`MAX_QUESTION_EVENTS`,
  `MAX_GLOBAL_EVENTS`, `MAX_QUESTION_BYTES`, `MAX_GLOBAL_BYTES`).
- It stores a structured `{ byQuestionId, global }` snapshot only on
  submit-boundary actions, not an ever-growing array on every dispatch.
- Storage errors disable recorder persistence and must not block survey dispatch.

### Gap to note
File: `client/src/components/QsNavBar/submission.ts`
- Completion path attaches `metadata.eventSummary`.

Backend currently does not clearly persist this metadata in completion DTO/schema path:
- `server/src/response/dto/completeSurveyResponse.dto.ts`
- `server/src/response/schemas/surveyResponse.schema.ts`

Implication:
- We can keep safe in-memory telemetry now, but durable persistence needs explicit backend support.

## Local Reproduction Guide

### Preconditions
1. Use a build where `REACT_APP_ENABLE_LEGACY_EVENT_RECORDER=true`.
2. Install deps and run normal local stack according to setup docs.
3. Use Safari for realism (WebKit behavior).
4. Open browser devtools console.

### Method A: Realistic approval-heavy reproduction
1. Open survey containing approval questions.
2. Perform high-volume interactions:
   - reorder options repeatedly,
   - toggle many options multiple times,
   - navigate back/forward where applicable.
3. Attempt submit.
4. Observe:
   - generic submit failure,
   - console quota errors,
   - possible sluggish UI.

Expected evidence:
- `QuotaExceededError` thrown near recorder/localStorage calls.

### Method B: Deterministic forced-quota simulation
In console before submitting:

```js
localStorage.setItem = () => {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
};
```

Then trigger an action and submit.

Expected on the historical fail-closed implementation:
- dispatch path throws,
- submit flow can fail,
- generic error appears.

Expected on the current implementation:
- recorder persistence is disabled,
- telemetry write failure is swallowed,
- dispatch and submit continue.

### Method C: Fill storage quickly (optional)
Use a script that repeatedly writes large values to localStorage to induce quota, then run approval interactions and submit with the legacy recorder explicitly enabled.

## How To Prove Frontend Storage Is The Root Cause
1. Confirm whether the build has `REACT_APP_ENABLE_LEGACY_EVENT_RECORDER=true`.
2. Instrument recorder middleware around `localStorage.setItem` with temporary logging.
3. Confirm thrown error class is `QuotaExceededError`.
4. Confirm error occurs before/around dispatch-based submit path.
5. Compare network tab:
   - If submit request is missing or interrupted while quota throws, frontend is causal.
6. Temporarily disable recorder middleware locally:
   - if issue disappears under same interactions, causality is confirmed.

## Immediate Mitigations
1. Confirm whether the affected build explicitly enabled the legacy recorder.
2. If the recorder is enabled, rebuild without `REACT_APP_ENABLE_LEGACY_EVENT_RECORDER=true`.
3. If a rebuild cannot be deployed in time:
   - advise participants to use Chrome for the affected session,
   - avoid long approval drag/reorder sequences where possible,
   - keep sessions shorter.
4. Have operators collect:
   - browser/version,
   - error timestamp,
   - whether request reached backend.

## Proposed Fix Strategy

### Current baseline
1. Legacy `eventRecorderMiddleware` is disabled by default.
2. If explicitly enabled for a build, it is fail-open:
   - storage writes are wrapped in try/catch,
   - storage errors disable recorder persistence,
   - telemetry failures do not block submit.
3. Do not regress this behavior.

Risk: low-to-medium (global middleware touch), but behavior change is intentionally protective.

### Future: Durable telemetry persistence
1. Persist compact telemetry summary (or chunked events) server-side via explicit API/schema.
2. Add retention policy/TTL for telemetry documents.
3. Keep browser storage only as bounded, optional fallback.

Risk: medium (backend contract and storage changes).

## Verification Matrix

### Historical failure mode
- Forced quota throw causes submit-path failures.
- Quota errors surface in console and can block flow.

### Current expected behavior
- Forced quota throw does not break dispatch or submit.
- Submission API call succeeds when backend is healthy.
- The legacy recorder is absent unless `REACT_APP_ENABLE_LEGACY_EVENT_RECORDER=true`.
- Recorder snapshots are bounded when the legacy recorder is explicitly enabled.

### Suggested CI checks
Run in CI mode:
1. Recorder middleware unit test where `localStorage.setItem` throws `QuotaExceededError` and dispatch still succeeds.
2. Submit flow tests:
   - `client/src/components/QsNavBar/__tests__/submission.test.ts`
   - `client/src/pages/survey/__tests__/NonQvCompletion.integration.test.tsx`
   - `client/src/pages/survey/__tests__/ApprovalSurvey.integration.test.tsx`

If backend telemetry persistence is added:
3. DTO/service tests confirming summary payload acceptance and storage.

## Maintenance Checklist
1. Reproduce once using Method B (deterministic throw).
2. Preserve the current fail-open, bounded recorder behavior.
3. Add the quota-throw regression test.
4. Run targeted CI-mode tests listed above.
5. Re-run deterministic reproduction and confirm submit no longer fails.
6. Update this document with final implementation notes and test coverage.

## Notes
- This issue is not evidence that approval logic is wrong; approval flow is a high-interaction trigger that exposed a telemetry/storage architecture weakness.
- Treat telemetry as best-effort. Survey submission must remain independent of client-side storage reliability.
