# Survey System Goal Sheet

Objective: Deliver a robust, single-origin quadratic survey system with a unified client state model (QV/Likert/Text), resilient submission and resume flows, and clear collaborator/submitter results, while keeping UI stable and focusing on correctness and analytics readiness.

## North Star (Next 3–5 Days)
- End-to-end mixed survey flow: [Instructional Page] → [Text Question] → [QV Question 1] → [Text Question] → [QV Question 2] → [Thank You].
- Unified state across types: Single slice manages QV/Likert/Text without duplicated legacy state.
- Data and behavior: Persist answers for each step; capture interaction metadata client-side; include metadata in completion payload (server DTO accept planned), retain snapshot-at-submission semantics.
- Results: Collaborator “Creator Results” with totals + raw votes; Submitter “Submitted” view as-of endTime.
- Reliability: DTO validation for writes, guards for access; duplicate-submission protection; idempotent update paths.
- Dev/prod setup: Single-origin serving; relative API base; exactly one SPA fallback; OAuth bootstrap (`/auth/me`) and refresh; CRA proxy for dev.

Acceptance Criteria
- Mixed survey navigates correctly across modules, preserving unified navigator state and responses.
- QV placements are resumeable once backend adds per-option placement metadata; in the interim, votes resume reliably.
- Behavior events recorded client-side and included in completion metadata; server acceptance planned.
- Results pages render and paginate correctly; aggregates match DB on spot checks.
- No duplicate submissions; invalid payloads are rejected with clear messages.

Out of Scope (for North Star window)
- Rich analytics beyond totals/raw; clustering; offline persistence; compression.
- Visual redesigns.

Legend: [x] Done, [ ] Not done, [~] Partial/in progress

Related context: codex/redux-and-slices.md

## Phase 1 – Foundations & MVP
- [x] Unified QV interactions foundation in a single slice (seed options, bins/categories, regroup/order, navigator state) with cross-type support (Likert/Text basics).
  - Client: unifiedResponses slice; integration tests for QV and cross-type navigation.
- [x] Public survey retrieval and response submission endpoints (create/update/batch/complete) with DTOs.
  - Server: user-response controller/service and DTOs for QV/Likert/Text.
- [x] Results MVP: collaborator-protected results endpoint with totals + raw votes; client Creator Results page.
  - Server: GET /api/v1/protected/surveys/:surveyId/results; Client: SurveyResultsPage with MoveVis visuals.
- [x] Submitter view and snapshot semantics (as-of endTime) via uuid routes; client Submitted Results section.
  - Server: GET /api/v1/survey/responses/:uuid and /:uuid/results; Client: SubmittedResultsSection.
- [x] Dev-only debug surfaces gated by env for identifiers and numeric tables.
  - Enabled in development; hidden in production builds.

## Phase 2 – Unify Response Architecture
- [x] Resume hydration: reconstruct QV placements/groups using backend snapshot bin/category metadata and per-option maps.
  - Status: Done. Backend snapshot includes `group`, `position`, `bins` and optional `navigator`; frontend hydrates bins/order, applies maps, recomputes positions, and syncs navigator. Unit + integration tests cover exact restoration and navigator state.
- [x] Submission flow: duplicate-submission guard handling aligned across server and client.
  - Status: Done. Server returns 409 `{ code: 'DUPLICATE_SUBMISSION' }`; frontend maps to unified status `duplicate` and surfaces a friendly message with action buttons. Integration test verifies message/buttons and state.

## Phase 3 – Enhance Multi-Question Support
- [~] Build shared renderer for mixed question modules (QV, Likert, Text) with unified navigation/progress.
  - Status: Partial. Unified slice supports QV/Likert/Text with basic navigation (qvNavigator) and `MultiQuestionSurveyPage` exists; cross-type tests present. Further unification of progress/flow across all types remains.
- [ ] Enable authoring support in survey editor (ordering, grouping, dependencies).
  - Status: Not done in UI. RTK Query endpoints for pages exist, but authoring UI for ordering/grouping/dependencies is not wired.

## Phase 4 – Behavioral State Capture
- [ ] Likert tracking: capture hover/selection/timing metadata and persist via unified slice.
  - Status: Client records selection + basic timing in slice; no hover capture; server DTO persists only final selection.
- [ ] Text tracking: record keystroke/edit cadence, clipboard events, and submission timing metadata.
  - Status: Client records length/timestamp; cadence/clipboard not tracked; server persists only final text.
- [ ] Optimize payload size for behavioral streams (compression + incremental send).
  - Status: Not done.

## Phase 5 – Response Packet Size Management
- [~] Incremental submission after each module with server checkpoints.
  - Status: Partial. Endpoints for create/update/batch/complete exist; submit queue scaffolded. Orchestrator and wiring to module transitions not yet implemented.
- [ ] Compress large response histories while retaining analytics fidelity.
  - Status: Not done.
- [ ] Investigate persistent storage (IndexedDB) for offline/long-running surveys.
  - Status: Not done.

## Phase 6 – Analytics and Insights
- [x] Integrate MoveVis-style analytics for submitter/creator dashboards under `SurveyResultsPage` and completion view.
  - Status: Done (baseline). Creator results page renders totals + raw votes with histogram/dots visualizations; submitter “Submitted” view merges own data and `asOf` aggregates.
- [x] Add dev/prod gating for debug visualisations and respondent identifiers.
  - Status: Done. Debug tables and respondent IDs gated via env; enabled in development.
