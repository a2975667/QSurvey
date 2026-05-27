Approval Voting (End-to-End)
============================

This document is the source of truth for how approval voting works across authoring, respondent runtime, backend validation, and results rendering.

Read together with:
- `docs/developer/frontend/survey-frontend.md`
- `docs/developer/frontend/unified-responses.md`
- `docs/developer/frontend/safari-submit-quota-exceeded.md`
- `docs/developer/backend/questions-backend.md`
- `docs/developer/results/results-visualization.md`

Overview
--------
- Current approval behavior is **up-to-K** approvals (not strict/exact K).
- K can be unlimited, explicitly configured, or derived by default.
- Frontend enforces constraints during interaction; backend remains authoritative at submit time.
- Approval results support `Dots / Chart / Table` in both designer and submitter views.

Key Files
---------
- Authoring + config UI:
  - `client/src/pages/survey/SurveyEdit.tsx`
- Respondent approval module:
  - `client/src/pages/survey/components/ApprovalSurveyPage.tsx`
  - `client/src/pages/survey/components/approvalSurvey.css`
- Frontend state + reducers:
  - `client/src/features/unifiedResponsesSlice.ts`
  - `client/src/features/unifiedResponsesSelectors.ts`
- Frontend submission helper:
  - `client/src/components/QsNavBar/submission.ts`
- Shared frontend limit resolver:
  - `client/src/utils/approvalLimits.ts`
- Backend schema + dto + service:
  - `server/src/questions/schemas/approval/approval-question.schema.ts`
  - `server/src/questions/dtos/createApprovalQuestion.dto.ts`
  - `server/src/questions/approval/approval-question.service.ts`
- Backend submission normalization + enforcement:
  - `server/src/response/user-response.service.ts`
  - `server/src/utils/approval-limit.ts`
- Results (designer + submitter):
  - `client/src/pages/designer/SurveyResultsPage.tsx`
  - `client/src/pages/survey/components/SubmittedResultsSection.tsx`
  - `client/src/components/results/ApprovalStickerStackChart.tsx`
  - `client/src/components/results/OptionTotalsBarChart.tsx`
  - `client/src/components/results/utils.ts`
- Backend results aggregation:
  - `server/src/surveys/surveys.service.ts`

Approval Question Model
-----------------------
- `type: 'approval'`
- Core fields:
  - `question`, `description`, `randomizeOptions`, `options[]`
  - `maxApprovals?`
  - `unlimitedApprovals` (boolean)
- Option IDs are normalized on create/update, and survey `questions` ordering still flows through `updateSurveyQuestionsById`.

Effective K Rule
----------------
Shared rule used by both frontend and backend:
- If `unlimitedApprovals === true`: no cap (`null` / unlimited).
- Else if `maxApprovals` is a positive integer: use it.
- Else default: `max(3, ceil(optionCount / 4))`.

Implementations:
- Frontend: `client/src/utils/approvalLimits.ts`
- Backend: `server/src/utils/approval-limit.ts`

Authoring Flow (Designer)
-------------------------
1. Designer creates/edits an approval question in `SurveyEdit`.
2. Designer can choose unlimited mode or set custom `maxApprovals`.
3. Payload is sent to approval question endpoints.
4. Backend normalizes options, stores cap fields, and updates survey question IDs.

Respondent Runtime Behavior
---------------------------
- Approval questions are rendered in `ApprovalSurveyPage` as a dedicated module for contiguous approval runs.
- Cards support:
  - toggle approve/unapprove
  - drag reorder (client-side only ordering)
- Local state keeps:
  - `approvals: string[]`
  - `order: string[]`
  - approval history events (toggle/reorder with timestamps)
- `approvalNavigator` tracks module order/completion/active question (QV-style navigator semantics).

Constraint behavior:
- UI blocks selection above effective K in capped mode.
- Unlimited mode has no cap.
- Zero approvals are allowed; forward navigation can show a soft warning modal.

Submission Behavior
-------------------
- Approval submission payload remains minimal:
  - `{ questionId, type: 'approval', responseContent: { approvals: string[] } }`
- Client submission path:
  - `submitApprovalQuestion` in `client/src/components/QsNavBar/submission.ts`
- Backend normalization:
  - filters unknown option IDs
  - dedupes approvals
- Backend enforcement:
  - if normalized approvals exceed effective K (when capped), reject with `400`
  - no truncation/clamping is applied server-side

Results Behavior
----------------
Aggregated shape:
- Approval totals are per-option non-negative counts (`sum` = number of approvals).
- Ordering uses total descending with original-option-order tie-break.

Designer + submitter approval results:
- Results panel supports `Dots / Chart / Table`.
- Default view for approval is `Dots`.
- Default view for non-approval remains `Chart`.
- Breakdown panel is not used for approval.

View specifics:
- `Dots`:
  - `ApprovalStickerStackChart` visualizes per-option approval dots.
- `Chart`:
  - `OptionTotalsBarChart` with `axisMode='nonNegative'`.
  - Bars always start at `0` for approval.
- `Table`:
  - Per-option count table.

Legacy-cap warning:
- Designer results computes whether any respondent raw selections exceed current effective K.
- If detected, a warning is shown.
- Totals are still displayed as recorded (legacy data is not rewritten in-place).

Testing Anchors
---------------
Core tests to update when behavior changes:
- `client/src/pages/survey/__tests__/ApprovalSurvey.integration.test.tsx`
- `client/src/features/__tests__/unifiedResponsesSlice.test.ts`
- `server/src/response/__tests__/vote-normalization.optionFilter.spec.ts`
- `client/src/pages/designer/__tests__/SurveyResultsPage.test.tsx`
- `client/src/pages/survey/__tests__/SubmittedResultsSection.test.tsx`

Important test pitfall:
- Approval results default to dots via state/effect sequencing.
- Tests that assert dots content should synchronize on toggle state (`Show dots view` with `aria-pressed='true'`) before asserting dots-specific stubs/elements.

Invariants
----------
- Keep approval semantics as up-to-K unless strict mode is intentionally introduced.
- Keep frontend and backend effective-K resolvers behaviorally aligned.
- Backend remains the final validator for over-cap payloads.
- Approval chart axis must remain non-negative.
- Approval totals ordering must keep original-option-order tie-break.

Future Work (Not Current Behavior)
----------------------------------
Strict/exact K approval mode is intentionally not active today.
- If introduced later, document the exact-mode semantics alongside the approval voting flow.
