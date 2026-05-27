Unified Responses State & Submission
====================================

This document describes how the frontend tracks respondent answers across all question types, how that state is used to build submission payloads, and how QV navigation is managed.

If you are debugging a submit/restore issue, you’ll almost always need this file plus:
- `frontend/survey-frontend.md` – how `SurveyView` and page modules use this state.
- `frontend/approval-voting.md` – approval-specific state, constraints, and submit rules.
- `frontend/debugging-surveys.md` – concrete troubleshooting steps.

Core Slice: unifiedResponses
----------------------------

File: `client/src/features/unifiedResponsesSlice.ts`

The `unifiedResponses` slice centralizes:
- Per-question answer state for all **answerable** types (QV, Text, Likert, Approval, Selection).
- QV navigation state (`qvNavigator`).
- High-level survey session state (`surveyId`, `surveyResponseId`, `uuid`, `status`, `error`).

Key fields (conceptual):
- `byQuestionId: Record<string, QState>`:
  - Stores the current answer for each question, keyed by questionId.
  - Different shapes per type:
    - Likert: `{ type: 'likert', questionId, selection, optionName?, history? }`
    - Text: `{ type: 'text', questionId, text, history? }`
    - QV: per-question QV state with `options`, votes, etc. (see slice for full shape).
    - Selection:
      - `{ type: 'selection', questionId, selectedOptionIds: string[], history? }`
    - Approval:
      - `{ type: 'approval', questionId, approvals: string[], options: Record<optionId, { optionName?, description? }>, order: string[], maxApprovals?, unlimitedApprovals?, history? }`
      - `history.events` tracks approve/unapprove and reorder events: `{ type: 'toggle', optionId, action: 'approve'|'unapprove', at }` and `{ type: 'reorder', order: string[], at }`.
      - `approvalNavigator` mirrors the QV navigator for multi-question approval flows: `order`, `completed`, `activeQuestionId`.
  - Note: `text_block` questions are **non‑answerable** and do not create entries in `byQuestionId`.
- `surveyId: string | null`:
  - The current survey ID associated with this session.
- `surveyResponseId: string | null`:
  - Server-side identifier for the respondent’s survey response (for resume and completion).
- `uuid: string | null`:
  - Client/session UUID used to correlate responses and resume sessions.
- `status: 'idle' | 'in_progress' | 'completed' | 'error'`:
  - High-level status of the current survey session.
- `error: string | undefined`:
  - Error message displayed by `MultiQuestionSurveyPage` and QV flows when submission fails.

QV Navigator (`qvNavigator`)
----------------------------

The QV module uses a dedicated navigator to manage which QV question is active and which ones have been completed:

- `qvNavigator.order: string[]`:
  - Ordered list of QV question IDs in the current QV module.
- `qvNavigator.completed: Record<string, boolean>`:
  - Flags indicating which QV questions are completed.
- `qvNavigator.activeQuestionId: string | undefined`:
  - The ID of the currently active QV question.
  - Cleared when all questions in `order` are completed (terminal state).

Relevant reducers:
- `syncQvNavigator`:
  - Updates `order`, `completed`, and `activeQuestionId` to match an incoming snapshot.
  - Uses a helper (see slice) that computes a terminal state when all are completed.
- `setActiveQvQuestion`, `goToNextQvQuestion`, `goToPreviousQvQuestion`:
  - Manage focus between QV questions.
  - Respect terminal conditions to avoid reactivating QV when all are completed.
- `markQvQuestionCompleted`, `markQvQuestionIncomplete`:
  - Mutate `completed` and recompute the appropriate `activeQuestionId`.

Hydration and resume:
- `fetchSurveyResponseByUUID.fulfilled` updates `unifiedResponses` and `qvNavigator` based on server snapshot.
- When all QV questions are completed in the snapshot, reducers ensure `activeQuestionId` is cleared (terminal state).

Per-Type Answer Reducers
------------------------

Likert: `setLikertSelection`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Signature:
```ts
setLikertSelection: PayloadAction<{ questionId: string; selection: string; optionName?: string; at?: number }>
```

Behavior:
- If there is no existing state for `questionId` or it’s not `type: 'likert'`:
  - Creates a new entry:
    ```ts
    state.byQuestionId[questionId] = {
      type: 'likert',
      questionId,
      selection,
      optionName,
      history: {
        lastEventAt: at || Date.now(),
        changes: [{ from: undefined, to: selection, at: at || Date.now() }],
      },
    };
    ```
- If there is an existing likert state:
  - Updates `selection` and, if provided, `optionName`.
  - Appends to `history.changes` and updates `history.lastEventAt`.

Used by:
- `MultiQuestionSurveyPage` → `handleLikertAnswer(questionId, selection)` → dispatches this action.
- `buildNonQvBatchPayload` when constructing likert responses for submission.

Text: `setTextAnswer`
~~~~~~~~~~~~~~~~~~~~~

Signature:
```ts
setTextAnswer: PayloadAction<{ questionId: string; text: string; at?: number }>
```

Behavior:
- If there is no existing state for `questionId` or it’s not `type: 'text'`:
  - Creates a new entry:
    ```ts
    state.byQuestionId[questionId] = {
      type: 'text',
      questionId,
      text,
      history: { lastEventAt: at || Date.now(), length: text.length },
    };
    ```
- If there is an existing text state:
  - Updates `text` and `history.lastEventAt`.

Used by:
- `MultiQuestionSurveyPage` → `handleTextAnswer(questionId, text)`.
- `buildNonQvBatchPayload` when constructing text responses.

Selection: `setSelectionAnswer`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Signature:
```ts
setSelectionAnswer: PayloadAction<{ questionId: string; selectedOptionIds: string[]; at?: number }>
```

Behavior:
- If there is no existing state for `questionId` or it’s not `type: 'selection'`:
  - Creates a new entry:
    ```ts
    state.byQuestionId[questionId] = {
      type: 'selection',
      questionId,
      selectedOptionIds,
      history: { lastEventAt: at || Date.now() },
    };
    ```
- If there is an existing selection state:
  - Updates `selectedOptionIds` and `history.lastEventAt`.

Used by:
- `MultiQuestionSurveyPage` → `handleSelectionAnswer(questionId, selectedOptionIds)`.
- `buildNonQvBatchPayload` when constructing selection responses.

QV Answers
~~~~~~~~~~

QV state is more complex:
- Contains per-option votes, total credits, and category/bin information.
- Managed by actions like `seedQvQuestion`, `qvSetBinsConfig`, `submitQvQuestion` orchestrator, and reducers in `unifiedResponsesSlice`.
- `QuadraticSurveyPage` uses selectors in `client/src/features/unifiedResponsesSelectors.ts` (e.g., `selectQvQuestion`, `selectQvNavigator`) to derive the view state for each QV question.

Submission Builders
-------------------

Non-QV: `buildNonQvBatchPayload`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

File: `client/src/utils/submissionBuilder.ts` (or equivalent).

Purpose:
- Given `unifiedState` and a list of non‑QV questionIds, build:
  - `responses`: the list of answer payloads to send to the API.
  - `unanswered`: list of questionIds that do not have valid answers.

Typical usage:
```ts
const { responses: formattedResponses, unanswered } = buildNonQvBatchPayload({
  unifiedState,
  questionIds: nonQvQuestionIds,
});
```

Behavior (conceptual):
- For each questionId:
  - Inspect `unifiedState.byQuestionId[questionId]`.
  - If type is `likert` and `selection` is set:
    - Add `{ questionId, responseContent: { type: 'likert', value: selection } }`.
  - If type is `text` and `text.trim().length > 0`:
    - Add `{ questionId, responseContent: { type: 'text', value: text } }`.
  - If type is `selection` and `selectedOptionIds` is valid:
    - Add `{ questionId, responseContent: { type: 'selection', selectedOptionIds } }`.
  - Otherwise, add questionId to `unanswered`.

Notes:
- `text_block` questions are non‑answerable and should not appear in `responses`.

The exact DTO shape may evolve, but the key invariants are:
- Every response includes the source `questionId` and a `responseContent.type` that matches the question’s type.
- `unanswered` only contains questions that the UI considers required but have no valid answer in `byQuestionId`.

Approval submissions
~~~~~~~~~~~~~~~~~~~~

- Approval responses are built via `buildQuestionSubmission` when `questionState.type === 'approval'`.
- Payload: `{ questionId, type: 'approval', responseContent: { approvals: string[] } }`.
- Current semantics are **up to K approvals** (not strict/exact K).
- Effective cap uses question settings:
  - `unlimitedApprovals === true` => no cap.
  - else `maxApprovals` when present.
  - else default `max(3, ceil(optionCount / 4))`.
- Approval reducers and approval page toggles enforce the cap in local state.
- Backend still validates authoritatively and rejects over-cap payloads with `400` (no truncation/clamping).
- Approval submit toolbar uses compact counters sourced from state:
  - capped: `X/Y approvals`;
  - unlimited: `X approvals selected`.
- Interaction history (toggle/reorder) is not sent to the backend in the first iteration; it stays client-side.
- Ordering is preserved in state (`order`), but submission only sends the approved optionIds.

Approval navigation
~~~~~~~~~~~~~~~~~~~

- `approvalNavigator` in `unifiedResponses` mirrors `qvNavigator`:
  - `order`: approval question IDs in this module.
  - `completed`: map of questionId → boolean.
  - `activeQuestionId`: current approval question; cleared when all are completed.
- Reducers: `syncApprovalNavigator`, `setActiveApprovalQuestion`, `goToNextApprovalQuestion`, `goToPreviousApprovalQuestion`, `markApprovalQuestionCompleted`, `markApprovalQuestionIncomplete`.
- `submitApprovalQuestion` (see `client/src/components/QsNavBar/submission.ts`) updates navigator after submit, similar to QV.

QV: `submitQvQuestion` and `completeSurveySubmission`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Files:
- `client/src/components/QsNavBar/submission.ts`

Responsibilities:
- `submitQvQuestion`:
  - Builds and dispatches a QV-specific submission payload for the active QV question.
  - Uses `unifiedResponses` to derive votes and metadata.
  - Updates navigator state (`completed`, `activeQuestionId`) via `syncQvNavigator`.
- `completeSurveySubmission`:
  - Called once all modules (QV and non‑QV) are done.
  - Sends a final completion request to the backend, including:
    - `surveyId`, `surveyResponseId`, `uuid`.
    - Optional metadata and keys (`sKey`, `uKey`).

Selectors
---------

File: `client/src/features/unifiedResponsesSelectors.ts`

Key selectors:
- `selectUnifiedSlice(state)`:
  - Convenience selector to fetch the entire `unifiedResponses` slice.
- `selectActiveQvQuestionId`, `selectQvNavigator`, `selectQvQuestion`:
  - Provide derived views of QV state for `QuadraticSurveyPage`.
- `selectQuestionResponseIds`:
  - Maps questionIds to response IDs, used for resume and QV completion heuristics.

These selectors are used primarily by:
- `SurveyView` (for resume and completion logic).
- `QuadraticSurveyPage` (to decide which question is active and what votes to display).

Error Handling
--------------

`unifiedResponses.error`:
- Set when:
  - Non‑QV batch submission fails.
  - QV submission or completion fails.
- Used in:
  - `MultiQuestionSurveyPage`: surfaces a user-facing error message above the submit button.
  - QV flows: may be used to show alerts or logs when submissions fail.

When debugging:
- Inspect `unifiedResponses.error` along with console logs to determine whether a failure is due to client validation, network/API errors, or backend validation (e.g., SSQ001).

Common Pitfalls
---------------

- Mismatched question IDs:
  - Ensure that `resolveQuestionId` used in `SurveyView` and `MultiQuestionSurveyPage` matches the IDs used as keys in `byQuestionId`.
  - If `questionId` vs `_id` is inconsistent, answers may not be seen by the submit logic, leaving `unanswered` populated.
- Missing state for new types:
  - When adding a new question type (e.g., Approval), you must:
    - Add a new reducer (e.g., `setApprovalSelection`) to populate `byQuestionId`.
    - Extend `buildNonQvBatchPayload` and `isSubmitEnabled` logic to recognize and validate that type.
- Selection validation mismatches:
  - If the frontend and backend disagree on selection constraints
    (`minSelections`, `maxSelections`, `required`, `controlRuleThresholds`),
    submissions may appear valid in the UI but be filtered on the server.
- Text blocks treated as required:
  - `text_block` questions have no answer state; they must be excluded from
    `unanswered` or submit gating, or the submit button will stay disabled.
- Navigator vs submission ordering:
  - Ensure that QV submissions update `qvNavigator` to the post-submit state before building the snapshot for persistence or resume, so the server/clients agree on completion status and active question.

How It All Fits Together
------------------------

To make this concrete, here is a typical end-to-end story:

1) Respondent opens a survey
- `SurveyView` loads survey data and questions.
- `unifiedResponses` is in its initial state: `byQuestionId` empty, `qvNavigator` empty, `status: 'idle'`.

2) Respondent answers a text question
- They type into the `TextQuestion` component.
- `TextQuestion` calls `onAnswer(questionId, text)`.
- `MultiQuestionSurveyPage.handleTextAnswer` dispatches `setTextAnswer({ questionId, text })`.
- `unifiedResponses.byQuestionId[questionId]` now contains `{ type: 'text', questionId, text }`.

3) Respondent answers a likert question
- They click on a scale option (e.g., “4”).
- `LikertQuestion` calls `onAnswer(questionId, selection)`.
- `handleLikertAnswer` dispatches `setLikertSelection({ questionId, selection })`.
- `unifiedResponses.byQuestionId[questionId]` now contains `{ type: 'likert', selection, ... }`.

4) Respondent answers a selection question
- They select one or more options (single or multi).
- `SelectionQuestion` calls `onAnswer(questionId, selectedOptionIds)`.
- `handleSelectionAnswer` dispatches `setSelectionAnswer({ questionId, selectedOptionIds })`.
- `unifiedResponses.byQuestionId[questionId]` now contains `{ type: 'selection', selectedOptionIds, ... }`.

5) Respondent submits non‑QV responses
- `MultiQuestionSurveyPage` calls `onSubmit`.
- `SurveyView.handleNonQVSubmit` calls `buildNonQvBatchPayload` with:
  - `unifiedState` (including `byQuestionId`).
  - The list of relevant `questionIds`.
- `buildNonQvBatchPayload`:
  - Reads the entries we just wrote into `byQuestionId`.
  - Produces `responses` and `unanswered`.
- `submitBatchQuestionResponses` sends `responses` to the backend.

6) Respondent returns later (resume)
- Resume endpoint retrieves saved responses and navigator snapshot.
- `fetchSurveyResponseByUUID.fulfilled` hydrates:
  - `unifiedResponses.byQuestionId` with prior answers.
  - `qvNavigator` with prior order/completion.
- `SurveyView` and module components derive initial UI state from this hydrated slice.

If any step above fails, you can usually spot it by:
- Inspecting `unifiedResponses.byQuestionId` in Redux DevTools.
- Comparing the IDs in `byQuestionId` to the IDs used in:
  - `segments` in `SurveyView`.
  - `buildNonQvBatchPayload(...)` inputs.
  - QV selectors (`selectQvQuestion`, `selectQvNavigator`) for QV flows.
