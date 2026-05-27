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
  - Services must never generate new ObjectIds when updating references for existing questions; they must always use the `_id` from the persisted document.
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
    - Validates that all referenced IDs exist via `getQuestionsByManyIds`.
    - Writes `{ $set: { questions: questionIds } }` to the survey document.
  - `SurveysService.updateSurveyQuestionsById` accepts `surveyId` as
    `Types.ObjectId | string` and normalizes via `ensureObjectId`.
- Question services (per type):
  - Create flows:
    - Save a new question via the appropriate model.
    - Get `savedQuestion._id` from the database.
    - Read existing `survey.questions`.
    - Build `updatedQuestionIds = [...existingIds, savedQuestion._id]`.
    - Call `updateSurveyQuestionsById` with a plain `{ questions: updatedQuestionIds }`.
  - Delete flow:
    - Read existing `survey.questions`.
    - Filter out the deleted `questionId`.
    - Call `updateSurveyQuestionsById` with the filtered list.

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

Example: `updateSurveyQuestionsById` (stripped down view):
```ts
const questionIds = Array.isArray(updateSurveyQuestionsDto.questions)
  ? updateSurveyQuestionsDto.questions.map((id) => {
      if (typeof id === 'string') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException('questionId is invalid');
        return new Types.ObjectId(id);
      }
      if (id && typeof id === 'object' && typeof (id as any).$oid === 'string') {
        const asString = (id as any).$oid;
        if (!Types.ObjectId.isValid(asString)) throw new BadRequestException('questionId is invalid');
        return new Types.ObjectId(asString);
      }
      if (id && id.toString && typeof id.toString === 'function') {
        const asString = id.toString();
        if (!Types.ObjectId.isValid(asString)) throw new BadRequestException('questionId is invalid');
        return new Types.ObjectId(asString);
      }
      throw new BadRequestException('questionId is invalid');
    })
  : [];
```

Key points:
- Accepts string IDs (from API).
- Accepts `$oid` wrappers (e.g., from raw JSON).
- Accepts existing ObjectIds (via `.toString()`).
- Always reconstitutes a clean `ObjectId` array.

Backend: Updating survey.questions without regenerating IDs
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Correct pattern (used in text/likert create and delete flows):
```ts
// From survey document
const currentQuestions = Array.isArray(survey.questions) ? survey.questions : [];
const currentQuestionIds = currentQuestions.map((q: any) =>
  q && typeof q.toString === 'function' ? q.toString() : String(q),
);

// Modify IDs as needed
const updatedQuestionIds = [
  ...currentQuestionIds.map((id) => new Types.ObjectId(id)),
  savedQuestion._id as Types.ObjectId,
];

await this.surveysService.updateSurveyQuestionsById(
  userId,
  surveyId,
  { questions: updatedQuestionIds } as any,
);
```

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
- All flows now pass plain objects with known IDs into `updateSurveyQuestionsById`.

Guidelines for New Code
-----------------------

When adding or modifying code that touches IDs:

1. **Always start from persisted IDs**:
   - Use the `_id` returned from `save()` or `findByIdAndUpdate()`.
   - Never fabricate IDs for existing entities.

2. **Normalize survey.questions explicitly**:
   - When you need to modify `survey.questions`:
     - Read the current `survey.questions`.
     - Convert each to string via `.toString()`.
     - Perform your filtering/appending logic on strings.
     - Convert back to `ObjectId` for persistence.

3. **Use `updateSurveyQuestionsById` for all survey question updates**:
   - Do not write directly to `survey.questions` outside this service.
   - This ensures validation (via `getQuestionsByManyIds`) is always applied.

4. **Avoid DTO transformation on ID arrays**:
   - For DTOs with ID arrays (e.g., `UpdateSurveyQuestionsDto`), use them at the controller boundary for validation only.
   - Inside services, build plain objects with normalized IDs and call methods like `updateSurveyQuestionsById` directly.

5. **Validate in tests**:
   - When adding new flows, write unit tests that:
     - Spy on `updateSurveyQuestionsById`.
     - Assert the `questions` payload contains exactly the IDs you expect (e.g., `[existingId, savedId]` or `[existingIds minus deletedId]`).

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
  - `updateSurveyQuestionsById - Raw DTO` and `Final ID list for DB update`.
  - `getQuestionsByManyIds called with IDs` and the count of resolved documents.
- If `getQuestionsByManyIds` finds fewer documents than IDs, check:
  - Are the IDs in the DTO the ones you expect?
  - Do those IDs exist in the `questions` collection?

Concrete “Good vs Bad” Examples
-------------------------------

Good:
- Creating a Text question and updating the survey:
  ```ts
  const saved = await textModel.save(); // saved._id from Mongo
  const currentQuestions = survey.questions; // e.g., [Q1, Q2]
  const updatedIds = [...currentQuestions.map(q => new Types.ObjectId(q.toString())), saved._id];
  await surveysService.updateSurveyQuestionsById(userId, surveyId, { questions: updatedIds });
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
