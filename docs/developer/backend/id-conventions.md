ID & ObjectId Conventions
=========================

This document describes how IDs are handled across the system: in MongoDB, backend services, and the frontend. The goal is to avoid subtle bugs caused by mixing strings, ObjectIds, and transformed DTOs.

If you hit ID-related issues (SSQ001, missing questions, inconsistent survey content), read this alongside:
- `docs/developer/backend/questions-backend.md` – how schemas and services are wired.
- `docs/developer/frontend/debugging-surveys.md` – step-by-step debugging recipes.

Principles
----------

- **Single source of truth in MongoDB**:
  - All question documents live in the `questions` collection.
  - All survey question references live in `survey.questions` as ObjectIds.
- **Strings at the edge, ObjectIds inside**:
  - API inputs/outputs use string IDs (JSON-friendly).
  - Backend services convert strings to `Types.ObjectId` as early as possible.
  - Mongo queries and stored references use `ObjectId`.
- **Route params are strings**:
  - `@Param()` values arrive as strings in Nest controllers.
  - Keep controller signatures typed as `string` for `:surveyId` routes.
  - Normalize inside the service using `ensureObjectId` to validate and convert.
- **No regeneration of IDs**:
  - Use the persisted document ID when updating references for an existing question.
  - DTO transformation (e.g., `plainToClass`) must not be used on arrays of IDs destined for persistence.

Where IDs Live
--------------

MongoDB
~~~~~~~

- Questions:
  - Collection: `questions`.
  - Schema: `server/src/questions/schemas/question.schema.ts` and type-specific schemas.
  - `_id`: `ObjectId`.
  - `type`: `'qv' | 'likert' | 'text' | 'approval' | 'selection' | 'text_block' | ...`.
- Surveys:
  - Schema: `server/src/surveys/schemas/survey.schema.ts`.
  - `questions: ObjectId[]` referencing `questions._id`.
  - `responses: ObjectId[]` referencing survey responses.

Backend Services
~~~~~~~~~~~~~~~~

- Core:
  - `CoreService.getQuestionsByManyIds(questionsIdList: Types.ObjectId[])`:
    - Accepts an array of IDs (various shapes).
    - Normalizes them to `ObjectId`s.
    - Queries all question models against the shared `questions` collection.
- Surveys:
  - `SurveysService.updateSurveyQuestionsById(userId, surveyId, updateSurveyQuestionsDto)`:
    - Accepts a DTO with `questions: (string | ObjectId | { $oid: string })[]`.
    - Converts each entry to a validated `ObjectId`.
    - Checks the proposed order is a permutation of the stored references and validates existence via `getQuestionsByManyIds`.
    - Writes `{ $set: { questions: questionIds } }` to the survey document.
  - `SurveysService.updateSurveyQuestionsById` accepts `surveyId` as
    `Types.ObjectId | string` and normalizes via `ensureObjectId`.
- Question services (per type):
  - Pass the new typed document to `saveNewSurveyQuestion` for creation.
  - Use `removeSurveyQuestion` for scoped detachment and conditional removal.

Frontend
~~~~~~~~

- API calls:
  - Use string IDs in URLs and payloads:
    - `/api/v1/protected/surveys/:id`
    - `/api/v1/protected/questions/:id`
    - Response payloads include string `_id` values.
- Redux state:
  - Question slice (`questionsSlice`):
    - Stores `byId` keyed by questionId strings.
    - `order` is an array of questionId strings.
  - Unified responses slice:
    - `byQuestionId` keyed by questionId strings.
  - Routing:
    - URL params (e.g., `/survey/:id`) use string IDs.

Normalization Patterns
----------------------

Backend: Normalizing IDs from DTOs
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The authoring services use `normalizeQuestionId` in `server/src/utils/question-id.ts` for ObjectIds, hexadecimal strings and stored reference wrappers. Reorder uses the stored references to check membership. The create path allocates a fresh ID and attaches it only after saving the question.

What to avoid:
- Passing raw `survey.questions` through `plainToClass(UpdateSurveyQuestionsDto, …)` or similar transformations.
- Constructing new ObjectIds unrelated to persisted question documents.

Historical Pitfall: DTO Transformations on ID Arrays
----------------------------------------------------

Problem:
- In previous code, some services did:
  ```ts
  const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
    questions: surveyQuestions,
  });
  await this.surveysService.updateSurveyQuestionsById(userId, surveyId, updateSurveyQuestionsDto);
  ```
- Because `UpdateSurveyQuestionsDto.questions` was typed as `Types.ObjectId[]`, the transformation ended up creating new ObjectIds, resulting in IDs that existed only in memory, not in the database.
- This surfaced as:
  - `getQuestionsByManyIds` returning 0 documents.
  - `updateSurveyQuestionsById` throwing `One or more questionIds do not exist [SSQ001]`.

Resolution:
- Removed `plainToClass` usage for ID arrays in:
  - Text question creation.
  - Likert question creation.
  - Question deletion (`QuestionsService.removeQuestionById`).
- Reorder accepts persisted IDs. Creation and removal use dedicated operations.

Guidelines for New Code
-----------------------

When adding or modifying code that touches IDs:

1. **Always start from persisted IDs**:
   - Use the `_id` returned from `save()` or `findByIdAndUpdate()`.
   - Never fabricate IDs for existing entities.

2. **Normalize question references** with `normalizeQuestionId`.

3. **Use the matching survey operation** for creation, reordering or detachment. See `questions-backend.md`.

4. **Avoid DTO transformation on ID arrays**:
   - For DTOs with ID arrays (e.g., `UpdateSurveyQuestionsDto`), use them at the controller boundary for validation only.
   - Inside services, build plain objects with normalized IDs and call methods like `updateSurveyQuestionsById` directly.

5. **Validate in tests**:
   - When adding new flows, write unit tests that:
     - Check persisted IDs and membership after each authorized operation.

Frontend Considerations
-----------------------

- Treat all IDs as strings:
  - When reading from API responses, always use string `_id` fields.
  - Use a consistent `resolveQuestionId` helper to pick `questionId` or `_id` for keys.
- Do not embed Mongo-specific shapes in Redux:
  - Keep `byId` and `order` keyed by plain strings (no `$oid` objects).
- When generating URLs or request payloads:
  - Use the original string form of `_id`.

If in doubt
-----------

When you need to modify IDs:
- Ask: “Am I using an ID that came from the database, and am I preserving it end-to-end?”
- Inspect logs from:
  - The stored survey order and proposed IDs when a reorder returns a conflict.
  - `getQuestionsByManyIds called with IDs` and the count of resolved documents.
- If `getQuestionsByManyIds` finds fewer documents than IDs, check:
  - Are the IDs in the DTO the ones you expect?
  - Do those IDs exist in the `questions` collection?

Concrete “Good vs Bad” Examples
-------------------------------

Good:
- Creating a Text question and updating the survey:
  ```ts
  const question = new this.textModel(validatedFields);
  await surveysService.saveNewSurveyQuestion(userId, surveyId, question);
  ```

Bad:
- Regenerating IDs via DTO transforms:
  ```ts
  // DO NOT DO THIS
  const dto = plainToClass(UpdateSurveyQuestionsDto, { questions: survey.questions });
  await surveysService.updateSurveyQuestionsById(userId, surveyId, dto);
  // dto.questions may now contain brand-new ObjectIds that never came from Mongo
  ```

If you see IDs in logs that:
- Were never saved as `_id` on any document, or
- Do not appear in `survey.questions` in Mongo,
then something in your path is generating IDs instead of reusing them. Track that code and replace it with the “Good” pattern above.
