Backend Questions & Survey Relationships
========================================

This page documents how question types are modeled and created on the backend,
how they relate to surveys, and the invariants you must preserve when touching
question or survey logic.

Scope
- Server-side question models and collections.
- Creation/update flows for QV, Text, Likert, Approval, Selection, and Text Block questions.
- How `survey.questions` is managed and validated.
- Patterns to follow when adding new question types.
- Pointers to the main frontend integration points that exercise these flows.

Quick Start Checklist
---------------------

If you are new to this repo and touching questions/surveys, skim this list:
- [ ] Understand that **all** question types live in the `questions` collection.
- [ ] Find question schemas under `server/src/questions/schemas/**`.
- [ ] Find question services/controllers under `server/src/questions/**`.
- [ ] Find survey service under `server/src/surveys/surveys.service.ts`.
- [ ] When you change question creation/update flows:
  - Use the dedicated survey service methods for creation, removal and reordering.
  - Do not invent new collections or bypass `getQuestionsByManyIds`.
- [ ] When you add a new question type:
  - Add a schema that uses `QUESTIONS_COLLECTION`.
  - Register it in `CoreModule` and `QuestionsModule`.
  - Add a service/controller.
  - Add a unit test that asserts the survey update payload includes the saved `_id`.

Core Concepts
-------------

Single Questions Collection
- All question types live in a single MongoDB collection named `questions`.
- The `QUESTIONS_COLLECTION` constant (server/src/questions/schemas/constants.ts)
  controls this name; every question schema imports and uses it.
- Schemas:
  - Base: `server/src/questions/schemas/question.schema.ts`
  - QV: `server/src/questions/schemas/qv/qv-question.schema.ts`
  - Likert: `server/src/questions/schemas/likert/likert.question.schema.ts`
  - TextInput: `server/src/questions/schemas/textInput/text-input.question.schema.ts`
  - Approval: `server/src/questions/schemas/approval/approval-question.schema.ts`
  - Selection: `server/src/questions/schemas/selection/selection-question.schema.ts`
  - Text Block: `server/src/questions/schemas/textBlock/text-block.question.schema.ts`
- Core module wiring:
  - `server/src/core/core.module.ts` registers all question models
    (QV, Likert, Text, Approval, Selection, Text Block) on the same
    Mongoose connection, all pointing at `questions`.

Survey → Questions Relationship
- Surveys are stored via `Survey` documents (server/src/surveys/schemas/survey.schema.ts).
- Each survey has a `questions` array of MongoDB ObjectIds referencing
  documents in the `questions` collection.
- The authoritative contract:
  - `survey.questions` must only contain valid ObjectIds that resolve to
    documents in `questions`.
  - `survey.questions` is the source of truth for question ordering.

Question Ordering Updates (Designer Reorder)
-------------------------------------------

- Endpoint: `PUT /api/v1/protected/surveys/:surveyId/question-order`
  - Controller: `server/src/surveys/protected-surveys.controller.ts`
  - Service: `SurveysService.updateSurveyQuestionsById`
- The handler accepts `{ questions: string[] }` in the desired order.
- The service requires a permutation of the selected survey's stored question IDs. A concurrent membership change returns HTTP 409 so the designer can reload.
- Ordinary survey creation starts with an empty question list. Type-specific creation calls `saveNewSurveyQuestion` with a new document. QV and QV Plus support one-based positional insertion. Survey and approved-template cloning generate fresh question documents.
- Scoped reads, edits and removal require a current collaborator or admin and membership in the selected survey. Designer question metadata excludes the global answer-ID list. Use the selected survey's results or exports to read responses.
- A historical question referenced by multiple surveys remains readable and reorderable in each. Removing it detaches the selected survey. A project-local edit returns HTTP 409 because the editor cannot express a change intended for every referencing survey. Global admin reporting retains its existing scope.

Frontend integration pointers
- Designer (authoring):
  - Main UI: `client/src/pages/survey/SurveyEdit.tsx`.
  - For each type, the designer ultimately calls:
    - QV: `POST /api/v1/protected/questions/qv`
    - Likert: `POST /api/v1/protected/questions/likert`
    - Text: `POST /api/v1/protected/questions/text`
    - Approval: `POST /api/v1/protected/questions/approval`
    - Selection: `POST /api/v1/protected/questions/selection`
    - Text Block: `POST /api/v1/protected/questions/text-block`
  - After backend creation, the designer re-fetches the survey via:
    - `GET /api/v1/protected/surveys/:surveyId`
    - That endpoint uses `getQuestionsByManyIds` and `mergeIdListWithDocList`
      to return type-specific question documents in survey order.
- Respondent (taking surveys):
  - Entry points: `client/src/pages/survey/components/QuadraticSurveyPage.tsx`
    and `MultiQuestionSurveyPage.tsx`.
  - These views rely on the survey payload produced by the protected/public
    survey endpoints; they assume:
    - Correct question ordering (same as `survey.questions`).
    - Type-specific fields present:
      - Likert: `scale`, `minLabel`, `maxLabel`
      - Text: `multiline`, `maxLength`
      - QV/Approval/Selection: `options`
      - Selection: `selectionMode`, `displayControl`, `minSelections`, `maxSelections`
      - Text Block: `content`, `newPage`

Shared Retrieval & Validation
- The core service provides a shared retrieval method:
  - `CoreService.getQuestionsByManyIds` (server/src/core/core.service.ts)
    accepts a list of IDs (string/ObjectId/$oid shapes) and:
    - Normalizes them to ObjectIds.
    - Queries all question models in parallel
      (base, QV, Likert, Text, Approval, Selection, Text Block)
      against the shared `questions` collection.
    - Merges results, preferring specific subtype models over the base.
- Surveys service validates survey question IDs via:
  - `SurveysService.updateSurveyQuestionsById` (server/src/surveys/surveys.service.ts).
  - Before writing `survey.questions`, it:
    - Normalizes incoming IDs into ObjectIds.
    - Compares the proposed IDs with the stored list. The conditional write rejects a concurrent membership change.
  - Public/protected survey fetches also rely on `getQuestionsByManyIds` to
    resolve and merge question documents in the same order as `survey.questions`.

Selection Questions: Retrieval Matters for Response Validation
--------------------------------------------------------------

- `UserResponseService.prepareContent` uses the question already loaded for the
  answer to filter `selectedOptionIds` and enforce the selection limits.
- If `getQuestionById` does not return a selection model (with options),
  the allowed set is empty and the response will be filtered to zero options.
- Ensure selection models are registered in `CoreModule` and preferred over
  base question documents in `CoreService.getQuestionById`.

Survey Responses & QV/QS Placement Metadata
------------------------------------------

Backend response storage is split across two collections:
- Per-question responses are stored in `QuestionResponses`:
  - Schema: `server/src/response/schemas/questionResponse.schema.ts` (strict false).
  - QV/QS response content includes placement metadata:
    - Per-option maps: `group` (optionId -> label) and `position` (optionId -> index).
    - Bin config: `bins` (`hasUndecided`, `hasSkip`, `userDefined`).
    - Ordering: `categoriesOrder` (label order).
    - Per-vote fields: `group` and `groupPosition` in the votes array.
  - DTO shape: `server/src/response/dto/qv-response.dto.ts`.
  - Normalization/persistence: `UserResponseService._normalizeResponseContent`
    in `server/src/response/user-response.service.ts`.
- Survey-level navigation snapshots are stored in `SurveyResponses`:
  - Field: `qvNavigator` with `{ order, activeQuestionId?, completed? }`.
  - Schema: `server/src/response/schemas/surveyResponse.schema.ts`.
  - Snapshot is updated whenever `navigator` is sent on create/update/batch
    flows in `server/src/response/user-response.service.ts`.

Important: there is no persisted "intermediate results" aggregation. Results
and dashboards are computed on demand from stored responses.

Question Creation Flows
-----------------------

The typed services construct a question and call `saveNewSurveyQuestion`, which checks survey access before saving and again when attaching the new ID. Ordinary appends use an atomic set addition. Positional insertion checks the order used to calculate the requested position. Detachment removes only matching references, including legacy ID representations. If an attachment write loses its acknowledgement, the service checks the committed membership on the primary. If the primary is still unavailable, the operation fails and preserves the question document for reconciliation.

QV Questions
- Controller: `server/src/questions/qv/qv.controller.ts`
- Service: `server/src/questions/qv/qv.service.ts`
- DTO: `CreateUpdateQVQuestionDto` (server/src/questions/dtos/createQVQuestion.dto.ts)
- Storage:
  - Uses `QVQuestion` model (server/src/questions/schemas/qv/qv-question.schema.ts).
  - Documents contain `setting` (credits, version, questionType) and `options`.
  - QV `setting` may include display-only `labelOverrides` for vote units, the
    sort button, and canonical bin labels. These aliases must not replace
    canonical response values such as `Positive`, `Neutral`, `Negative`,
    `Undecided`, and `Skip`.
- Creation steps:
  - Validate ownership via `CoreLogicService`.
  - Build a `QVQuestion` document from the DTO.
  - Call `saveNewSurveyQuestion` with the document and optional insertion position.

Example QV create payload (from designer):
```json
{
  "type": "qv",
  "surveyId": "<surveyId>",
  "question": "Rank the options",
  "description": "Spend your credits",
  "setting": {
    "totalCredits": 100,
    "version": 1,
    "questionType": "qv",
    "labelOverrides": {
      "votePositive": "upvote",
      "voteNegative": "downvote",
      "voteNone": "No votes",
      "sortByVotes": "Sort by Votes",
      "binLabels": {
        "Positive": "Positive",
        "Neutral": "Neutral",
        "Negative": "Negative",
        "Undecided": "Undecided",
        "Skip": "Skip"
      }
    }
  },
  "options": [
    { "optionId": "a", "optionName": "Alpha", "description": "A" },
    { "optionId": "b", "optionName": "Bravo", "description": "B" }
  ]
}
```

Text Questions
- Controller: `server/src/questions/text/text.controller.ts`
- Service: `server/src/questions/text/text.service.ts`
- DTOs:
  - `CreateTextQuestionDto` (server/src/questions/dtos/createTextQuestion.dto.ts)
  - `UpdateTextQuestionDto`
- Storage:
  - Uses `TextInputQuestion` model.
  - Fields: `type: 'text'`, `question`, `description`, `multiline`, `maxLength`, `groupId`.
- Creation uses the shared `saveNewSurveyQuestion` path. The typed-service test is in `server/src/questions/text/text.service.spec.ts`.

Example Text create payload:
```json
{
  "type": "text",
  "surveyId": "<surveyId>",
  "question": "Tell us what you think",
  "description": "Open feedback",
  "multiline": true,
  "maxLength": 500
}
```

Likert Questions
- Controller: `server/src/questions/likert/likert.controller.ts`
- Service: `server/src/questions/likert/likert.service.ts`
- DTOs:
  - `CreateLikertQuestionDto` (server/src/questions/dtos/createLikertQuestion.dto.ts)
  - `UpdateLikertQuestionDto`
- Storage:
  - Uses `LikertQuestion` model.
  - Fields: `type: 'likert'`, `question`, `description`, `scale`, `minLabel`, `maxLabel`, `groupId`.
- Creation uses the shared `saveNewSurveyQuestion` path. The typed-service test is in `server/src/questions/likert/likert.service.spec.ts`.
- Historical bug (fixed):
  - The Likert service previously used `plainToClass(UpdateSurveyQuestionsDto, …)`
    right before calling `updateSurveyQuestionsById`. Because `UpdateSurveyQuestionsDto`
    typed `questions` as `Types.ObjectId[]`, the transformation generated a fresh
    set of ObjectIds, causing validation to fail with SSQ001. The current flow
    avoids DTO transformation entirely for ID lists.

Approval Questions
- Controller: `server/src/questions/approval/approval-question.controller.ts`
- Service: `server/src/questions/approval/approval-question.service.ts`
- DTOs:
  - `CreateApprovalQuestionDto`, `UpdateApprovalQuestionDto`
- Canonical cross-layer reference:
  - `docs/developer/frontend/approval-voting.md`
- Storage:
  - Uses `ApprovalQuestion` model.
  - Fields: `type: 'approval'`, `question`, `description`, `randomizeOptions`, `options[]`, `maxApprovals?`, `unlimitedApprovals`.
- Creation steps:
  - Fetch survey and validate ownership.
  - Normalize options (fix option IDs).
  - Pass the typed approval document to `saveNewSurveyQuestion`.
- TL;DR behavior:
  - Respondents send `responseContent.approvals: string[]` of optionIds.
  - Current approval mode is **restricted up-to-K** (not strict/exact K).
  - Effective cap rule:
    - If `unlimitedApprovals === true`, no cap is enforced.
    - Else if `maxApprovals` is set, respondents may approve up to that value.
    - Else default cap is `max(3, ceil(optionCount / 4))`.
  - Submission is normalized/deduped and filtered to the question’s optionIds
    (`prepareContent` in
    `server/src/response/user-response.service.ts`).
  - If filtered+deduped approvals exceed the effective cap, backend rejects with `400`
    (no clamping/truncation; payload must be corrected client-side and resubmitted).
  - Results aggregation counts each approved option as `+1` per response
    (`buildApprovalResults` in `server/src/surveys/surveys.service.ts`); no weights
    are applied.
- Developer notes (frontend interplay):
  - Respondent UI now uses a dedicated `ApprovalSurveyPage` (module per contiguous
    run of approval questions). Cards are draggable for ordering but bins/credits
    are not part of approval; the order is stored client-side only.
  - Submission payloads stay minimal: `{ responseContent: { approvals: string[] } }`;
    zero approvals are still allowed. A soft-warning modal fires only on forward
    nav when no approvals are selected.
  - Frontend enforces the same effective cap in interaction reducers and page
    toggle logic, but backend remains authoritative and rejects over-cap payloads.
  - Interaction history (toggle/reorder events with `Date.now()` timestamps) is
    tracked in the client to enable future backend logging; today only the
    `approvals[]` array is sent.
  - Results visualization renders approval-specific totals modes (`Dots / Chart / Table`)
    with no approval breakdown panel; chart mode is non-negative.

Selection Questions
- Controller: `server/src/questions/selection/selection-question.controller.ts`
- Service: `server/src/questions/selection/selection-question.service.ts`
- DTOs:
  - `CreateSelectionQuestionDto`, `UpdateSelectionQuestionDto`
- Storage:
  - Uses `SelectionQuestion` model.
  - Fields:
    - `type: 'selection'`
    - `selectionMode`: `single` | `multi`
    - `displayControl`: `radio` | `dropdown` | `auto` | `checkbox` (multi only)
    - `required`, `minSelections`, `maxSelections`
    - `controlRuleThresholds.singleToDropdownAt` (required when `displayControl=auto`)
    - `randomizeOptions`, `options[]`, `groupId`
- Creation/update steps:
  - Validate ownership via `CoreLogicService`.
  - Normalize options using `fixQVOptionID` to ensure `optionId`s.
  - Normalize config:
    - `multi` forces checkbox control.
    - `minSelections <= maxSelections <= optionCount` for multi.
    - `singleToDropdownAt` required when `displayControl=auto`.
  - Pass the typed selection document to `saveNewSurveyQuestion`.
- Response handling:
  - Only selections from the question’s option set count toward its limits.

Text Block Questions
- Controller: `server/src/questions/textBlock/text-block.controller.ts`
- Service: `server/src/questions/textBlock/text-block.service.ts`
- DTOs:
  - `CreateTextBlockQuestionDto`, `UpdateTextBlockQuestionDto`
- Storage:
  - Uses `TextBlockQuestion` model.
  - Fields: `type: 'text_block'`, `content`, `newPage`
- Sanitization:
  - `CreateTextBlockQuestionDto.content` is sanitized with `sanitize-html` on input.
- Behavior:
  - Text blocks are non‑answerable content blocks.
  - Used by the frontend to insert instructions or section breaks.

Invariants & "Do/Do Not" Guidance
---------------------------------

ID & Collection Invariants
- All question documents **must** live in the `questions` collection.
- Every `survey.questions` entry **must**:
  - Be a valid ObjectId.
  - Resolve to an existing document in `questions` as seen by
    `CoreService.getQuestionsByManyIds`.
- Never introduce a per-type questions collection (e.g., `likertquestions`,
  `textinputquestions`); if you see one in a database, it is legacy and should
  be migrated into `questions`.

Updating `survey.questions`
- Use `saveNewSurveyQuestion` to create, `updateSurveyQuestionsById` to reorder and `removeSurveyQuestion` to detach an existing reference.
- Do **not**:
  - Use `plainToClass` or any DTO transformation on ID lists intended for
    `updateSurveyQuestionsById`. This has previously led to regenerated IDs.
  - Construct fresh ObjectIds for survey questions without using the actual
    `_id` returned from the question create/save call.

Adding a New Question Type
--------------------------

When introducing a new question type (e.g., NPS, multiple-choice), follow these steps:

1. Schema & Collection
   - Create a new schema class under `server/src/questions/schemas/<type>/`.
   - Set `@Schema({ collection: QUESTIONS_COLLECTION, ... })` or inherit from
     a base that already uses `QUESTIONS_COLLECTION`.
   - Register the model in both:
     - `server/src/questions/questions.module.ts`
     - `server/src/core/core.module.ts`

2. Service & Controller
   - Add a type-specific service under `server/src/questions/<type>/<type>.service.ts`.
   - Add a controller for create/update endpoints under
     `server/src/questions/<type>/<type>.controller.ts`.
   - Pass the new document to `saveNewSurveyQuestion` for authorization and attachment. Scoped edits must first call `authorizeSurveyQuestion`.

3. Tests & Guardrails
   - Cover the typed creation and edit paths alongside `server/src/questions/questions.service.spec.ts` and the membership cases in `server/src/surveys/surveys.service.updateQuestions.spec.ts`.

4. Avoiding Known Pitfalls
   - Do **not** reuse DTOs like `UpdateSurveyQuestionsDto` with
     `Types.ObjectId[]` in combination with `plainToClass` for update payloads.
   - If you must define a DTO involving question IDs, use it for validation at
     the controller boundary, but internally pass a plain object with the
     already-normalized ObjectIds into `updateSurveyQuestionsById`.

5. Frontend/Backend Contract Checks
   - When changing question schemas or DTOs:
     - Update the designer payloads in `SurveyEdit.tsx` to match.
     - Run the client tests that exercise question creation:
       - `client/src/pages/survey/__tests__/SurveyEdit.test.tsx`
       - Any integration tests around Likert/QV/Text flows.
   - When changing backend survey/question behavior:
     - Run the server tests that guard question and survey invariants:
       - `server/src/core/core.service.spec.ts` (questions retrieval).
       - `server/src/questions/__tests__/question-collection.spec.ts` (collection invariants).
       - `server/src/surveys/surveys.service.updateQuestions.spec.ts`.
       - Type-specific tests like `text.service.spec.ts`, `likert.service.spec.ts`.

QV Label Override Contract
--------------------------

- QV label overrides are stored on QV question settings as `setting.labelOverrides`.
- Overrides are display-only. They must not replace canonical response values:
  - canonical bin IDs remain `Positive`, `Neutral`, `Negative`, `Undecided`, and `Skip`;
  - response payloads and aggregate queries continue to use canonical IDs and numeric votes.
- Backend DTO validation for QV label overrides lives in
  `server/src/questions/dtos/qvLabelOverrides.dto.ts`.
  Create/update QV DTOs import that shared validation class instead of duplicating
  field rules.
- The completed participant-results question catalog may expose
  `setting.labelOverrides`, but should not expose unrelated private/internal
  settings fields.
- Survey locale is stored separately at `survey.settings.locale`; question aliases
  remain per-question display overrides.

How to Use This Doc
-------------------
- If you are:
  - Debugging missing questions: check the stored IDs and the documents returned by
    `getQuestionsByManyIds` when loading the survey.
  - Adding a new question type: mirror the patterns documented above, and add
    matching tests.
  - Refactoring surveys or questions: preserve the single `questions`
    collection and the invariant that survey question IDs must resolve through
    `getQuestionsByManyIds` with no regeneration or client-supplied IDs.

If in doubt:
- Start by locating the relevant service (QV/Text/Likert/Approval).
- Confirm it:
  - Saves to the `questions` collection.
  - Uses the saved `_id` when updating the survey.
  - Calls the authorized survey service operation for creation, editing, removal or reordering.
- Add or update tests before and after your change to make sure these invariants hold.
