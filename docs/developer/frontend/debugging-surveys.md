Debugging Surveys & Questions
=============================

This document is a practical playbook for debugging survey/question issues in this repo. It focuses on where to look, which logs to enable, and how to reason about common failure modes.

For deeper background on the underlying models and flows, cross-reference:
- `docs/developer/backend/questions-backend.md` – backend schemas and services.
- `docs/developer/frontend/survey-frontend.md` – how respondent pages are composed.
- `docs/developer/frontend/unified-responses.md` – how answers and navigation state are stored.

Quick Map
---------
- Backend:
  - SSQ001 / bad question IDs.
  - Question delete failures (400s on DELETE).
  - Questions missing in respondent view.
  - Collaborator lookup/mutation issues.
- Frontend:
  - Disabled submit button in non‑QV segments.
  - Selection validation (min/max/exclusive) blocking submit.
  - Text block questions accidentally treated as required.
  - QV navigator misbehavior.
  - Resume/UUID bugs.
  - Designer vs respondent mismatches.

Layers to Keep in Mind
----------------------

1. **Database** (MongoDB):
   - `surveys` collection holds surveys and their `questions` arrays (ObjectIds).
   - `questions` collection holds all question documents (QV, Text, Likert, Approval).
2. **Backend services**:
   - `CoreService`, `SurveysService`, question-type services.
   - Key functions: `getQuestionsByManyIds`, `updateSurveyQuestionsById`, `mergeIdListWithDocList`.
3. **Frontend state**:
   - `questionsSlice` (loaded survey questions).
   - `unifiedResponses` (answers and QV navigator).
4. **Frontend pages**:
   - `SurveyEdit` (designer).
   - `SurveyView`, `QuadraticSurveyPage`, `MultiQuestionSurveyPage` (respondent).

Backend Debugging
-----------------

1) SSQ001: “One or more questionIds do not exist”
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Where it comes from:
- `SurveysService.updateSurveyQuestionsById`:
  - After normalizing question IDs, it calls `CoreService.getQuestionsByManyIds`.
  - If any requested ID is not resolved, it throws `BadRequestException('One or more questionIds do not exist [SSQ001]')`.

What to inspect:
- Logs from `updateSurveyQuestionsById`:
  - `Raw DTO`: shows the incoming `questions` payload.
  - `Question IDs`: string form of each ID.
  - `Final ID list for DB update`: the normalized `ObjectId` list.
- Logs from `getQuestionsByManyIds`:
  - `model collections`: confirms all models point at `questions`.
  - `getQuestionsByManyIds called with IDs: [...]`.
  - `Found total of X questions out of Y IDs`.
  - `Missing question IDs: [...]` if applicable.

Checklist:
- Do the IDs in the Raw DTO match what you *expect* from the calling service?
  - If no, the caller is regenerating or mis-building the ID array.
- Do those IDs exist in the `questions` collection?
  - Use `db.questions.find({ _id: ObjectId('<id>') })` to confirm.
 - If the IDs exist in Mongo but `getQuestionsByManyIds` finds zero:
  - Confirm model registration in `CoreModule` and `QuestionsModule`.
  - Confirm `QUESTIONS_COLLECTION` is aligned across schemas.

Common sources of bad IDs:
- Using `plainToClass` with DTOs that define `questions: Types.ObjectId[]`, which can generate new ObjectIds.
- Manually constructing IDs instead of using the `_id` returned from `save()`/`findById...`.

2) Question Not Deleting / Delete Returns 400
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Symptoms:
- Designer delete calls `DELETE /api/v1/protected/questions/:id` and receives 400.
- Backend logs show `surveyId` missing or SSQ001 during deletion.

What to check:
- Frontend:
  - `SurveyEdit.deleteQuestion` should send:
    ```ts
    fetch(`${API_PREFIX}/protected/questions/${questionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ surveyId: survey?._id }),
    });
    ```
- Backend:
  - `QuestionsController.deleteQuestionById` expects a `SurveyIdDto` in the body.
  - `QuestionsService.removeQuestionById`:
    - Should read `survey.questions`.
    - Filter out `questionId`.
    - Call `updateSurveyQuestionsById` with the filtered ID list.

3) Questions Missing in Respondent View
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Symptoms:
- Backend survey shows a question ID in `survey.questions`, but the respondent UI doesn’t display it.

Steps:
- Backend:
  - `servePublicSurveyById` (or protected equivalent) calls `getQuestionsByManyIds` and `mergeIdListWithDocList`.
  - Check logs:
    - `Survey questions IDs: [...]`.
    - `Retrieved X question documents`.
    - `mergeIdListWithDocList` logs for each ID: “Found document for ID”, etc.
- Frontend:
  - In `SurveyView`, inspect `questions.byId` and `questions.order`:
    - `orderedQuestions` should include the missing ID.
  - Check if filters in `segments` or `MultiQuestionSurveyPage` are excluding it:
    - QV segments: should include only `type: 'qv'`.
    - Non‑QV segments: filter out `type: 'qv'` but keep others.

If a question is missing:
- Confirm that:
  - It exists in `questions` collection.
  - It’s included in `survey.questions`.
  - `mergeIdListWithDocList` merges it into the payload.
  - The frontend mapping from payload to Redux (`questionsSlice`) stores it in `byId` and `order`.

4) Collaborator Lookup/Mutation Issues
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
- Email lookup endpoint: `GET /api/v1/protected/profiles/lookup?email=` is protected (Jwt + Roles Designer/Admin).
  - The `lookup` route must be defined **before** `/:id` in `ProtectedUsersController` or `/lookup` will be parsed as an `:id` and return 400.
- Lookup behavior:
  - Case-insensitive match on `email`.
  - 400 → invalid email format.
  - 404 → no user found.
  - If you see 404 for valid users, verify `findUserByEmailCaseInsensitive` is wired and the caller is authenticated with the right roles.
- Collaborator mutations: `/api/v1/protected/surveys/:id/collaborators`
  - Require the caller to be a collaborator or admin (enforced via `validateSurveyOwnership` for non-admins).
  - Mutations normalize ids to ObjectIds, dedupe duplicates, and always re-include the caller (self-retention).
  - 400 “At least one collaborator is required” usually means the request attempted to drop the last collaborator (e.g., removing self).
  - If collaborator changes “don’t stick”, confirm that the update endpoint is being called (not just the local state), and that the follow-up survey fetch uses the protected route (public surveys strip collaborators).

Frontend Debugging
------------------

1) Submit Button Disabled (Non‑QV)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Symptoms:
- Multi-question (non‑QV) survey shows the “Submit Responses” button disabled, even after answering visible questions.

Where to look:
  - `MultiQuestionSurveyPage.tsx`:
    - `nonQvQuestions`: all questions in the current segment with `type !== 'qv'`.
    - `isSubmitEnabled`:
    ```ts
    const isSubmitEnabled = useMemo(() => {
      if (nonQvQuestions.length === 0) return false;
      return nonQvQuestions.every((question) => {
        const questionId = resolveQuestionId(question);
        const state = unifiedResponses.byQuestionId?.[questionId];
        if (!state) return false;
        if (state.type === 'likert') {
          return Boolean(state.selection);
        }
        if (state.type === 'text') {
          return Boolean(state.text && state.text.trim().length > 0);
        }
        if (state.type === 'selection') {
          return isSelectionAnswerValid(question, selections);
        }
        return false;
      });
    }, [nonQvQuestions, unifiedResponses.byQuestionId]);
    ```

Debugging aid:
- There is a debug effect that logs:
  ```ts
  console.log('[DEBUG][MultiQuestionSurveyPage] submit state snapshot', {
    isSubmitEnabled,
    questions: nonQvQuestions.map(...),
  });
  ```
- Expand this log in DevTools:
  - Each entry: `{ id, type, ready, state }`.
  - Any `ready: false` entry is blocking the submit button.

Common causes:
- Non-rendered types (e.g., `type: 'approval'`):
  - Included in `nonQvQuestions` and validation, but not rendered.
  - No state in `unifiedResponses.byQuestionId`, so `ready` stays `false`.
- Text blocks included as required:
  - `text_block` has no answer state; ensure it is treated as always ready.
- Selection constraints mismatch:
  - Min/max/required/exclusive rules can keep `isSubmitEnabled` false.
- `questionId` mismatch:
  - `resolveQuestionId` picks `_id` vs `questionId` differently from how answers are keyed, so answers never show up in `byQuestionId[questionId]`.

2) QV Navigator Issues
~~~~~~~~~~~~~~~~~~~~~~

Symptoms:
- QV module doesn’t advance, jumps incorrectly, or reponders see the wrong QV question active.

Where to look:
- Redux DevTools:
  - Inspect `unifiedResponses.qvNavigator`: `order`, `completed`, `activeQuestionId`.
- Logs:
  - `QuadraticSurveyPage` may log warnings when selector results change unexpectedly.
- Submission code:
  - `submitQvQuestion` orchestrator should:
    - Mark the current question completed.
    - Compute next active question or terminal state.
    - Dispatch `syncQvNavigator` with the post-submit state.

Checklist:
- Ensure `qvNavigator.order` matches the QV question IDs in the current module.
- Ensure `completed` flags are set correctly after submission.
- Ensure `activeQuestionId` is cleared when all QV questions are completed.

3) Resume/UUID Issues
~~~~~~~~~~~~~~~~~~~~~

Symptoms:
- Respondent tries to resume a survey and lands on an unexpected question or sees no prior answers.

Where to look:
- Metadata slice:
  - `metadata.surveyId`, `metadata.resumeUuid`, `sKey`, `uKey`.
- Unified responses slice:
  - `surveyId`, `surveyResponseId`, `uuid`.
- Effects in `SurveyView`:
  - On load, `fetchSurveyResponseByUUID` is dispatched when:
    - `metadata.loaded && metadata.resumeUuid && metadata.surveyId`.

Checklist:
- Confirm that:
  - The resume URL includes `uuid` (and keys, if needed).
  - The backend recognizes the UUID and returns a response snapshot.
  - The fulfillment of `fetchSurveyResponseByUUID` populates `unifiedResponses` appropriately.

4) Designer vs Respondent Mismatch
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Symptoms:
- Survey looks correct in the designer but behaves unexpectedly in the respondent view (e.g., missing question types, wrong ordering).

Where to look:
- Designer:
  - `SurveyEdit.tsx`:
    - Confirm that the designer creates the intended question types and payloads.
    - Confirm delete/updates are successful (no error messages, survey refresh shows expected questions).
- Backend:
  - Confirm that the survey in Mongo reflects the designer actions:
    - Correct `survey.questions` IDs and order.
    - All question documents exist in `questions`.
- Respondent:
  - Confirm that the protected survey endpoint returns the same `survey.questions` and question details that the designer sees.

If you find a mismatch:
- Start from DB:
  - Survey and questions collections.
- Then backend:
  - Survey and question services logs.
- Then frontend:
  - `questionsSlice` state and `segments` in `SurveyView`.

End-to-End Debugging Example
----------------------------

As a concrete example, here is how you might debug a disabled submit button in a mixed survey:

1) Confirm backend survey shape
- Use Mongo shell or Atlas UI:
  - Fetch the survey by `_id`.
  - Inspect `survey.questions` to see:
    - Which question IDs exist.
    - In what order.
  - Check `questions` collection for each ID to confirm type (`text`, `likert`, `approval`, `qv`).

2) Confirm backend payload to frontend
- On a respondent load, watch the server logs from `servePublicSurveyById`:
  - `Survey questions IDs: [...]`.
  - `Retrieved X question documents`.
  - `mergeIdListWithDocList` logs for each ID.
- Ensure the list and order match `survey.questions`.

3) Confirm Redux questions state
- In the browser:
  - Open Redux DevTools.
  - Inspect `questions` slice:
    - `byId` contains all expected IDs.
    - `order` aligns with backend order (or is empty if falling back).

4) Inspect segments and non‑QV questions
- In `SurveyView`, add (temporarily) a log of `segments`:
  - Confirm that non‑QV segments contain exactly the IDs you expect.
- In DevTools console, expand:
  - `[DEBUG][MultiQuestionSurveyPage] submit state snapshot`.
  - Check each `{ id, type, ready, state }` entry:
    - Any `ready: false` entry indicates a question that UI considers required but unanswered.

5) Map unanswered question back to design
- Take the `id` from the `ready: false` entry.
- In Mongo or `questions` slice, find that question:
  - Is it an `approval` question that we don't yet render?
  - Is it a text/likert question that’s hidden by grouping logic?
- Fix either:
  - The rendering (ensure the question is visible to the respondent), or
  - The validation (exclude that type from `nonQvQuestions` until supported).

6) Regression protection
- Once fixed, add or update tests:
  - For submit behavior (client).
  - For ID validation and survey updates (server).

This pattern—start at DB, then backend logs, then frontend state, then UI—is the most reliable way to track down survey/question issues without guesswork.

General Tips
------------

- Prefer small, targeted logs:
  - Backend: log IDs and types, not full documents, unless necessary.
  - Frontend: log structured snapshots (objects with `id`, `type`, `ready`, etc.).
- Use existing tests as guides:
  - Server:
    - `question-collection.spec.ts`
    - `surveys.service.updateQuestions.spec.ts`
    - `text.service.spec.ts`, `likert.service.spec.ts`, `questions.service.spec.ts`
  - Client:
    - `SurveyEdit.test.tsx`
    - `QuestionOrder.integration.test.tsx`
    - `LikertSurvey.integration.test.tsx`
    - `MultiQuestionSurveyPage.test.tsx`
- If you touch shared flows (ID handling, survey updates), add or update tests to lock in the expected behavior.
