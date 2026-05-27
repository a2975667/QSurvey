Survey Clone Flow (Backend)
===========================

This page documents the protected survey clone flow: endpoint contract, clone semantics, transaction behavior, and invariants to preserve.

Key Files
---------
- `server/src/surveys/protected-surveys.controller.ts`
- `server/src/surveys/surveys.service.ts`
- `server/src/surveys/surveys.module.ts`
- `server/src/utils/question-type.ts`

Endpoint Contract
-----------------
- Route: `POST /api/v1/protected/surveys/:surveyId/clone`
- Controller: `ProtectedSurveysController.cloneSurvey(...)`
- Service: `SurveysService.cloneSurvey(userId, roles, surveyId)`
- Auth: `JwtAuthGuard` + `RolesGuard`
- Allowed roles: `Admin`, `Designer`
- Access rule: requester must be `Admin` or a collaborator on the source survey.

Success response:
```json
{ "_id": "<newSurveyId>" }
```

Clone Semantics
---------------
What is copied:
- Survey authoring content:
  - `title` (with suffix), `description`, `tags`, `settings`, `collaborators`.
- Question order:
  - New survey `questions` array preserves source order.
- Question content:
  - New question documents are created per source question with type-specific models.

What is changed:
- New survey ID and new question IDs are always generated.
- Cloned title becomes:
  - `<source title> (Cloned)`

What is excluded:
- Response/runtime artifacts are not copied:
  - question-level `responses`
  - question/survey timestamps and identity fields (`_id`, `id`, `__v`, `createdAt`, `updatedAt`)
- Response collections (`SurveyResponses`, `QuestionResponses`) are not touched.

Type Dispatch Rules
-------------------
`SurveysService.getQuestionModelForType(...)` selects clone target model by detected type:
- `qv` -> `QVQuestion`
- `approval` -> `ApprovalQuestion`
- `selection` -> `SelectionQuestion`
- `likert` -> `LikertQuestion`
- `text` -> `TextInputQuestion`
- `text_block` -> `TextBlockQuestion`

Important invariant:
- Unsupported question types throw `BadRequestException`.
- There is no fallback to base `Question` model for clone writes.

Transaction & Atomicity
-----------------------
Clone execution first attempts a Mongo session transaction:
1. Start session from survey model connection.
2. `withTransaction(...)` clones questions and creates survey in one unit.
3. End session in `finally`.
4. Return cloned survey ID only if transaction commits.

Transactional result:
- Prevents partial clone persistence (for example: some cloned questions without a cloned survey) on operation failure.

Fallback behavior:
- If Mongo reports transactions are unsupported (for example, standalone/local Mongo rather than a replica set or mongos), `cloneSurvey(...)` falls back to `cloneSurveyWithoutTransaction(...)`.
- The fallback writes cloned questions first, then the cloned survey.
- If the fallback fails after creating artifacts, it attempts cleanup by deleting the cloned survey ID if available and deleting any cloned question IDs it recorded.
- This fallback is best-effort, not fully atomic. A process crash or cleanup failure can leave partial clone artifacts in non-transactional deployments.

Collaborator Behavior
---------------------
- Source collaborators are normalized and copied to the clone.
- Fallback:
  - if normalized collaborator list is empty/invalid, clone includes only the cloning user.

Rules / Invariants
------------------
- Never mutate source survey or source question documents.
- Preserve source question order exactly.
- Keep clone writes type-specific; do not write subtype content through the base model.
- Keep clone operation authorization-parity with other protected survey operations.
- Keep clone operation atomic when transactions are available; preserve best-effort cleanup and clear warning behavior for non-transactional fallback deployments.

Extension Guidance
------------------
If you add a new question type:
1. Add type detection support.
2. Register/inject the new model in `SurveysModule` / `SurveysService`.
3. Add model mapping in `getQuestionModelForType(...)`.
4. Add clone tests for the new type.

Related Tests
-------------
- `server/src/surveys/protected-surveys.controller.spec.ts`
- `server/src/surveys/surveys.service.spec.ts`
