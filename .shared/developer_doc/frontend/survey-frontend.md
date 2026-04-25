Frontend Survey Flow
====================

This document explains how the frontend renders and submits surveys, how QV and non‑QV modules are composed, and which components are involved in each stage.

If you are new to this code, read this file together with:
- `.shared/developer_doc/frontend/unified-responses.md` – how respondent answers and QV navigation are stored.
- `.shared/developer_doc/frontend/approval-voting.md` – approval-specific end-to-end behavior and invariants.
- `.shared/developer_doc/backend/questions-backend.md` – how the backend models questions and surveys.

Quick Map
---------
- Designer:
  - `SurveyEdit.tsx` – authoring questions, settings, and collaborators.
- Respondent:
  - `SurveyView.tsx` – orchestrates QV, Approval, and non‑QV modules.
- QV module:
  - `QuadraticSurveyPage.tsx` – bins, credits, and QV navigator.
- Approval module:
  - `ApprovalSurveyPage.tsx` – approval cards and approval navigator.
- Non‑QV module:
  - `MultiQuestionSurveyPage.tsx` – text/likert/selection/text‑block questions and submit gating.
- Submission helpers:
  - `buildNonQvBatchPayload` and `submitBatchQuestionResponses`.
- Cross‑cutting:
  - `unifiedResponses` slice – shared answer/navigation state for all modules.

High-Level Entry Points
-----------------------

- Designer (authoring):
  - `client/src/pages/survey/SurveyEdit.tsx`
  - Lets designers add/edit/delete questions (QV, Text, Likert, Approval, Selection, Text Block) and survey settings.
- Respondent (taking surveys):
  - `client/src/pages/survey/SurveyView.tsx`
  - Renders the live survey for respondents, orchestrating:
    - `QuadraticSurveyPage` for QV questions.
    - `ApprovalSurveyPage` for Approval questions (module per contiguous run of approval questions).
    - `MultiQuestionSurveyPage` for non‑QV questions (Text/Likert/Selection/Text Block).

You can think of `SurveyEdit` as defining **what** the survey contains and in what order, while `SurveyView` defines **how** that ordered list is presented to respondents.

Designer Project List: Clone Action
-----------------------------------

File: `client/src/pages/designer/DesignerPage.tsx`

Designer project cards include a top-right copy icon action that deep-clones a survey:
- UI trigger:
  - Top-right card action menu trigger class: `.survey-card-actions-trigger`
  - Accessible label: `Project actions for <survey title>`
  - Menu item label: `Clone survey`
- Request:
  - `POST /api/v1/protected/surveys/:surveyId/clone`
  - Sent through `fetchProtected(...)` with auth refresh/failure handlers.
- Success behavior:
  - Reads returned `{ _id }` from the clone endpoint.
  - Navigates immediately to `/survey/<clonedId>/edit`.
- In-flight guard:
  - `cloneSurveyId` state is used as a global lock.
  - While one clone request is active, clone buttons are disabled across the list to prevent duplicate concurrent clone submissions.

Related styles/tests:
- Styles: `client/src/pages/designer/designer.css`
- Tests: `client/src/pages/designer/__tests__/DesignerPage.searchSort.test.tsx`

SurveyEdit: Accessibility & Test Contracts
------------------------------------------

`SurveyEdit` has a few explicit accessibility hooks that tests also rely on. If you change these, expect to touch tests as well:

- Add-question buttons:
  - Main add button in the questions header:
    - Visible text: `Add New Question`.
    - ARIA name: `aria-label="Add question"`.
    - Location: `client/src/pages/survey/SurveyEdit.tsx` in the `.questions-header` `question-actions` block.
  - Empty-state CTA:
    - Visible text: `Add Your First Question`.
    - No ARIA label (we keep a single accessible “Add question” control at a time).
  - Tests query by: `getByRole('button', { name: /add question/i })`.

- Text question form labels:
  - Main prompt: `Question Text:`.
  - Description: `Description/Instructions:`.
  - Character limit:
    - Label: `Maximum Character Length:`.
    - Input id: `maxLength`.
  - Tests use `getByLabelText` with those exact strings, so keep them stable unless you also update tests.

- Multiline text toggle:
  - Checkbox has: `name="multiline"` and
    `aria-label="Allow multiple lines of text (paragraph)"`.
  - This ARIA label is the contract used in tests (`getByLabelText(...)`).

- Likert defaults:
  - When the type is switched to `'likert'` via the type selector, the default form state is:
    - `scale: ['1', '2', '3', '4', '5']`
    - `minLabel: 'Strongly Disagree'`
    - `maxLabel: 'Strongly Agree'`
  - The Likert settings UI uses:
    - `Minimum Scale Label:` (for `minLabel`).
    - `Maximum Scale Label:` (for `maxLabel`).
  - Tests assert that the payload for a default Likert question has the numeric 1–5 scale; if you change the default scale representation, update those tests.

SurveyEdit: Question Ordering (Reorder Modal)
---------------------------------------------

The designer can reorder questions via a modal in `SurveyEdit`:
- UI entry point: “Reorder questions” button (disabled unless there are 2+ questions).
- Modal:
  - Uses a local `reorderDraft` array derived from `survey.questions`.
  - Each row shows the question title and type with “Move up/Move down” controls.
  - Save triggers a `PUT /api/v1/protected/surveys/:surveyId/question-order` call with
    `{ questions: string[] }` in the new order.
  - Cancel closes the modal and discards `reorderDraft`.
- Accessibility:
  - Modal wrapper uses `role="dialog"` and `aria-labelledby="reorder-modal-title"`.
  - The title element has `id="reorder-modal-title"`.
  - Escape key closes the modal.

If you change any of these behaviors, update `SurveyEdit.test.tsx` reorder tests.

SurveyEdit: Collaborators Row
-----------------------------

- Location:
  - UI: `client/src/pages/survey/SurveyEdit.tsx` in the survey info panel, rendered as `Collaborators: [pills] (Edit|Save)`.
  - Styles: `client/src/pages/survey/surveyEdit.css` (collaborators row and pills).
- Data source:
  - On load, `SurveyEdit` calls `GET /api/v1/protected/surveys/:surveyId/collaborators` to populate collaborator pills.
  - Each pill is `{ userId, email, isSelf }`; the current designer (`isSelf: true`) is always included and non‑removable.
- Editing behavior:
  - Clicking `Edit` switches the row into edit mode:
    - Shows a compact email input inline with the pills.
    - Tokenizes emails on Enter/Tab/space/comma/blur.
  - For each token:
    - Calls `GET /api/v1/protected/profiles/lookup?email=...`.
    - On success, adds a collaborator pill (if not already present).
    - On 400/404, shows an inline error message and does **not** add a pill (designer must ask the collaborator to sign up first).
  - Removing:
    - In edit mode, non‑self pills show a small remove icon.
    - Self pill is visually marked (e.g., “(you)”) and cannot be removed.
- Saving:
  - Clicking `Save` sends `PUT /api/v1/protected/surveys/:surveyId/collaborators` with the full collaborator id list.
  - The response is used to refresh local collaborator state; this keeps frontend and backend in sync and re‑asserts that the caller remains a collaborator.
  - Collaborator saves are independent of question edits; changing collaborators does not require saving question content.

SurveyEdit: Selection Questions
-------------------------------
Selection questions are authored entirely in `SurveyEdit` and have a richer config surface than text/likert:

- Question type: `selection` (UI label “Selection”).
- Endpoint:
  - Create: `POST /api/v1/protected/questions/selection`
  - Update: `PUT /api/v1/protected/questions/selection/:id`
- Core fields:
  - `selectionMode`: `single` or `multi`
  - `displayControl`: `radio` | `dropdown` | `auto` (single only)
  - `required`: boolean
  - `minSelections`, `maxSelections` (multi only)
  - `randomizeOptions`: boolean
  - `controlRuleThresholds.singleToDropdownAt` (required when `displayControl=auto`)
  - `options[]`: each option includes name, description, and `isExclusive`
- UI behavior:
  - Mode toggle: Single vs Multi.
  - Single display control: Radio / Dropdown / Auto.
  - Auto mode requires a threshold (switch to dropdown when options ≥ threshold).
  - Multi mode forces checkbox list; min/max selection inputs are shown.
  - “Exclusive option” clears other selections (enforced in UI + backend filtering).
  - Option details can be expanded per row; bulk expand/collapse toggles exist.
- Validation (client‑side mirrors backend):
  - At least 1 option required.
  - `minSelections <= maxSelections <= optionCount`.
  - `singleToDropdownAt` required when `displayControl=auto`.

SurveyEdit: Text Block Questions
--------------------------------
Text blocks are non‑answerable content blocks used for instructions or section breaks.

- Question type: `text_block` (UI label “Text Block”).
- Endpoint:
  - Create: `POST /api/v1/protected/questions/text-block`
  - Update: `PUT /api/v1/protected/questions/text-block/:id`
- Fields:
  - `content` (HTML string)
  - `newPage` (boolean: insert a page break in non‑QV flow)
- Validation:
  - `content` must be non‑empty.
  - Backend sanitizes HTML input (see `CreateTextBlockQuestionDto`).

SurveyView: Orchestrating the Respondent Flow
---------------------------------------------

File: `client/src/pages/survey/SurveyView.tsx`

Responsibilities:
- Load survey metadata, questions, and existing responses (for resume).
- Preserve and respect the server’s `survey.questions` order.
- Split questions into segments:
  - QV segments (`type: 'qv'`).
  - Approval segments (`type: 'approval'`).
  - Non‑QV segments (`type: 'nonQv'` for text/likert).
- Render the appropriate page/module for the active segment.
- Coordinate submission and completion.

Key pieces:
- `orderedQuestions`:
  - Built from `questions.order` and `questions.byId`, preserving backend order.
  - Fallbacks to `byId` values with position-based sorting when no explicit order is present.
- `segments`:
  - Built by scanning `orderedQuestions` and grouping consecutive questions into:
    - `{ type: 'qv', questionIds: string[] }`
    - `{ type: 'approval', questionIds: string[] }`
    - `{ type: 'nonQv', questionIds: string[] }` (text, likert, selection, text_block)
  - This defines top-level “modules” in the respondent experience.
- Segment state:
  - `activeSegmentIndex` chooses which segment is currently visible.
  - `advanceToNextSegment()` increments this index when a module completes.

Conceptually, the segment list is:
- `segments[0]`: First run of QV, Approval, or non‑QV questions.
- `segments[1]`: Next run of the other type, if present.
- …
Segments are the *top-level “pages/modules”* that respondents move through.

Rendering per segment:
- QV:
  ```tsx
  {activeSegment?.type === 'qv' && (
    <QuadraticSurveyPage
      style={config.style}
      inputType={config.inputType}
      onCompleteLastQuestion={handleQvModuleComplete}
      hasNextModuleAfterQv={Boolean(segments.slice(activeSegmentIndex + 1).length)}
      questionIds={activeSegment.questionIds}
    />
  )}
  ```
- Approval:
  ```tsx
  {activeSegment?.type === 'approval' && (
    <ApprovalSurveyPage
      style={config.style}
      onCompleteLastQuestion={handleApprovalModuleComplete}
      hasNextModuleAfterApproval={Boolean(segments.slice(activeSegmentIndex + 1).length)}
      questionIds={activeSegment.questionIds}
    />
  )}
  ```
- Non‑QV:
  ```tsx
  {activeSegment?.type === 'nonQv' && (
    <MultiQuestionSurveyPage
      onSubmit={() => handleNonQVSubmit(activeSegment.questionIds)}
      questionIds={activeSegment.questionIds}
    />
  )}
  ```

QuadraticSurveyPage (QV Module)
-------------------------------

File: `client/src/pages/survey/components/QuadraticSurveyPage.tsx`

Responsibilities:
- Render the QV module for one or more QV questions.
- Manage QV-specific navigation and state seeding (credits, categories, options).
- Call `onCompleteLastQuestion` when the final QV question (in this module) is submitted.

Key flows:
- Question list:
  - Derives `questionList` from `questions.byId` + ordering.
  - Builds `qvOrder` as a list of QV question IDs, preserving survey order and falling back to legacy `position` when needed.
- Navigator:
  - Uses `qvNavigator` from `unifiedResponses`:
    - `order`: list of QV question IDs.
    - `completed`: completion flags per QV question ID.
    - `activeQuestionId`: the current QV question being shown.
  - Effects call `syncQvNavigator` to keep navigator in sync with `qvOrder` and resume candidates.
  - Honors a “terminal” state where all QV questions are completed and `activeQuestionId` is cleared.
- Submission:
  - Uses `submitQvQuestion` via `QsNavBar`.
  - `handleQvModuleComplete` in `SurveyView`:
    - Advances to the next segment, or
    - Calls `completeSurveySubmission` if this was the last module.

Welcome/instructions:
- `QuadraticSurveyPage` can start on a `WelcomeView` (instructions) before showing questions.
- There is a separate work item (20251202-qv-instruction-repeat) to ensure instructions are not repeatedly shown when re-entering QV modules.

ApprovalSurveyPage (Approval Module)
------------------------------------

File: `client/src/pages/survey/components/ApprovalSurveyPage.tsx`

Canonical approval reference:
- `.shared/developer_doc/frontend/approval-voting.md`

Responsibilities:
- Render approval questions as their own module (contiguous approval run → one module; each question → its own page).
- Seed approval state in `unifiedResponses` (options, order, prior approvals) and sync the approval navigator (`approvalNavigator`) similar to `qvNavigator`.
- Provide QV-style option cards without bins/credits:
  - Draggable vertical list for personal ordering that persists while the respondent stays in the survey.
  - Click anywhere on a card to toggle approval; trailing chip shows “Approved” (checkmark) or “Click to approve”.
  - Drag handle styling mirrors QV (neutral blue, rounded).
- Restriction model:
  - Current approval mode is **restricted up-to-K** (not strict/exact K).
  - Effective cap resolution:
    - `unlimitedApprovals === true` => no cap.
    - Else `maxApprovals` when provided by designer.
    - Else default cap `max(3, ceil(optionCount / 4))`.
  - UI blocks selecting above the effective cap and shows inline limit messaging.
- Navigation:
  - Previous/Next across approval questions; zero-approval soft-warning modal on forward nav when nothing is approved (“Are you sure you want to approve none?”).
  - Submit toolbar center shows compact approval counter:
    - Capped mode: `X/Y` with label `Approvals`.
    - Unlimited mode: `X` with label `Approvals selected`.
  - Primary action button stays in the right section; final-step button label is “Submit survey”.
- Submission:
  - Uses `submitApprovalQuestion` via `QsNavBar`.
  - Payload per question: `{ questionId, type: 'approval', responseContent: { approvals: string[] } }` (deduped and filtered to known optionIds).
- Interaction history:
  - Client-only tracking of toggle/reorder events with `Date.now()` timestamps to enable future backend logging; not sent today.

MultiQuestionSurveyPage (Non‑QV Module)
---------------------------------------

File: `client/src/pages/survey/components/MultiQuestionSurveyPage.tsx`

Responsibilities:
- Render non‑QV questions (text/likert/selection/text‑block) for the current segment.
- Integrate with `unifiedResponses` to track answers.
- Compute whether the primary action button should be enabled.
- Call `onSubmit` when the respondent submits the current non‑QV segment.

Key behaviors:
- Question source:
  - Receives a list of `questionIds` from `SurveyView`.
  - Looks up question objects via Redux `questions.byId`.
  - Extracts:
    - Grouped questions (using `question.groupId` and `surveys.questionGroups`).
    - Ungrouped questions.
  - Filters only non‑QV types:
    - `text`, `likert`, `selection`, `text_block` (approval handled in `ApprovalSurveyPage`).
- Answer wiring:
  - For Likert:
    - Renders `LikertQuestion` and passes `onAnswer={handleLikertAnswer}`.
    - `handleLikertAnswer(questionId, selection)` dispatches `setLikertSelection`.
  - For Text:
    - Renders `TextQuestion` and passes `onAnswer={handleTextAnswer}`.
    - `handleTextAnswer(questionId, text)` dispatches `setTextAnswer`.
  - For Selection:
    - Renders `SelectionQuestion` with mode/control/constraints.
    - `handleSelectionAnswer(questionId, selectedOptionIds)` dispatches `setSelectionAnswer`.
  - For Text Block:
    - Renders `HtmlContent` with sanitized HTML from `question.content`.
- Submit enablement:
  - Uses `unifiedResponses.byQuestionId` to build `answerMaps`.
  - `isSubmitEnabled`:
    - `true` if there are **no answerable** questions (only text blocks).
    - Otherwise, requires **every** non‑QV question to be “ready”:
      - Likert: `selection` is truthy.
      - Text: `text.trim().length > 0`.
      - Selection: passes `isSelectionAnswerValid` (mode + min/max + required).
      - Text Block: always ready (non‑answerable).
    - Any non‑handled type causes `false`.
  - The button:
    ```tsx
    <button
      className="survey-submit-button"
      disabled={!isSubmitEnabled || isSubmitting}
      onClick={handleSubmit}
    >
      {isSubmitting ? 'Submitting...' : 'Submit Responses'}
    </button>
    ```
  - There is a planned improvement (20251202-nonqv-page-divider) to:
    - Introduce per-page navigation within non‑QV segments.
    - Use “Next” vs “Submit” labels based on whether the action is advancing or completing.

Non‑QV Submission Flow
----------------------

File: `client/src/pages/survey/SurveyView.tsx`, `handleNonQVSubmit`

Steps:
1. Determine `surveyId` from metadata/router.
2. Determine target questionIds:
   - `questionIdsOverride` (the current non‑QV segment) or `nonQvQuestionIdsOrdered`.
3. Build payload via `buildNonQvBatchPayload({ unifiedState, questionIds })`:
   - Produces:
     - `responses`: list of `{ questionId, responseContent: { type, value } }`.
     - `unanswered`: ids of non‑QV questions without an answer.
   - Notes:
     - Selection answers use `selectedOptionIds`.
     - Text blocks are excluded from responses.
4. Validation:
   - If `unanswered.length > 0`, show an alert and abort.
   - If `responses.length === 0`, alert “No responses to submit.”
5. Build batch payload for API:
   ```ts
   const batchPayload = {
     surveyId,
     responses,
     uuid: unifiedState.uuid || metadata.resumeUuid,
     surveyResponseId: unifiedState.surveyResponseId || undefined,
     sKey: metadata.sKey,
     uKey: metadata.uKey,
   };
   ```
6. Dispatch `submitBatchQuestionResponses(batchPayload)`:
   - If fulfilled:
     - If a later segment exists, advance to it.
     - Otherwise, call `completeSurveySubmission` and navigate to `/survey/:id/complete`.
   - If rejected:
     - Show a generic or API-provided error.

Designer vs Respondent Interplay
--------------------------------

- Designer (`SurveyEdit.tsx`) creates/updates questions and relies on backend to:
  - Persist questions into the unified `questions` collection.
  - Maintain `survey.questions` as an ordered list of IDs.
  - Respondent (`SurveyView.tsx`) relies on:
  - `GET /protected/surveys/:id` to:
    - Return `survey.questions` with IDs in the correct order.
    - Return resolved question documents via backend `mergeIdListWithDocList`.
  - `segments` computed from `orderedQuestions` to:
    - Decide when a new “page/module” starts (QV vs Approval vs non‑QV).
    - Decide which set of questionIds to pass to each module.
- Ensuring consistency:
  - When updating question creation or deletion flows on the server, preserve:
    - Single `questions` collection.
    - Correct `survey.questions` IDs in order.
  - When changing frontend flows, keep:
    - `segments` and `orderedQuestions` as the source of truth for question order.
    - Module boundaries (QV vs Approval vs non‑QV) aligned with backend expectations.

Typical “Call Stacks”
---------------------

For quick orientation, here are common call stacks for key actions.

1) Respondent loads a survey
- `SurveyView` mounts.
- Effects dispatch:
  - `fetchSurveyData(id)` → populates `questionsSlice` and `surveysSlice`.
  - `fetchMetaData` + key/uuid setup.
- `orderedQuestions` and `segments` recompute from `questions` slice.
- First segment renders:
  - QV → `QuadraticSurveyPage`.
  - Approval → `ApprovalSurveyPage`.
  - Non‑QV → `MultiQuestionSurveyPage`.

2) Respondent answers an approval question
- `ApprovalSurveyPage` option card click → `toggleApprovalOption({ questionId, optionId })`.
- Drag-and-drop reorder → `reorderApprovalOptions({ questionId, order })`.
- `unifiedResponses.byQuestionId[questionId]` updated (approvals set, order, history).

3) Respondent answers a Likert question
- `LikertQuestion` UI → `onAnswer(questionId, selection)`.
- `MultiQuestionSurveyPage.handleLikertAnswer`:
  - Dispatches `setLikertSelection({ questionId, selection })`.
- `unifiedResponses.byQuestionId[questionId]` updated.
- `isSubmitEnabled` recomputes based on the updated state.

4) Respondent submits a non‑QV segment
- `MultiQuestionSurveyPage` submit button → `handleSubmit` → `onSubmit`.
- In `SurveyView`:
  - `handleNonQVSubmit(activeSegment.questionIds)`:
    - Calls `buildNonQvBatchPayload` with `unifiedState`.
    - Validates `unanswered` and `responses`.
    - Dispatches `submitBatchQuestionResponses`.
    - On success:
      - If another segment exists → `advanceToNextSegment`.
      - Else → `completeSurveySubmission` and navigate to `/complete`.

5) Respondent submits an approval question
- `QsNavBar` primary button (Next/Submit) → `submitApprovalQuestion`.
- If no approvals are selected and the action is forward, a soft-warning modal asks “Are you sure you want to approve none?”.
- On success:
  - Marks the question completed in `approvalNavigator` and advances to the next approval question if present.
  - If this was the last module/question, calls `completeSurveySubmission`.

Understanding these flows will help you reason about where to add features (e.g., new question types, non‑QV paging) and where to hook in debug logs when things go wrong.
