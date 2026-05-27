Data Flow: Surveys, Responses, Results
======================================

Purpose
-------
- Provide end‑to‑end flows across backend + frontend.
- Explain which APIs and storage collections are involved.
- Highlight invariants that must stay aligned across layers.

1) Survey Authoring Flow (Designer)
-----------------------------------
Frontend entry:
- `client/src/pages/survey/SurveyEdit.tsx`

Backend entry points:
- Create survey: `POST /api/v1/protected/surveys`
- Update survey: `PUT /api/v1/protected/surveys/:id`
- Reorder questions: `PUT /api/v1/protected/surveys/:surveyId/question-order`
- Question creation:
  - QV: `POST /api/v1/protected/questions/qv`
  - Likert: `POST /api/v1/protected/questions/likert`
  - Text: `POST /api/v1/protected/questions/text`
  - Approval: `POST /api/v1/protected/questions/approval`
  - Selection: `POST /api/v1/protected/questions/selection`
  - Text Block: `POST /api/v1/protected/questions/text-block`

Storage behavior:
- New questions are saved to the **single** `questions` collection.
- `survey.questions` is updated via `SurveysService.updateSurveyQuestionsById`.
- Backend resolves and returns questions via `getQuestionsByManyIds` +
  `mergeIdListWithDocList` to preserve ordering.

Key invariants:
- Never regenerate ObjectIds when updating `survey.questions`.
- Always append the saved question `_id` to the survey’s question list.

2) Survey Load (Respondent)
---------------------------
Frontend entry:
- `client/src/pages/survey/SurveyView.tsx`

Backend entry:
- `GET /api/v1/surveys/:surveyId`
  - Optional query: `sKey`, `uKey`, `uuid`

Flow:
1) Backend resolves survey by ID and validates access keys.
2) Backend resolves question documents in the order of `survey.questions`.
3) Frontend builds `orderedQuestions` and segments:
   - QV segments
   - Approval segments
   - Non‑QV segments (Text, Likert, Selection, Text Block)

3) Respondent Answer Submission
-------------------------------
Public endpoints:
- `POST /api/v1/survey/responses` (single question response)
- `POST /api/v1/survey/responses/batch` (batch responses for non‑QV)
- `PUT /api/v1/survey/responses/complete` (mark survey complete)

Frontend behavior:
- QV questions: `QsNavBar` → `submitQvQuestion` → `survey/responses`
- Approval questions: `QsNavBar` → `submitApprovalQuestion`
- Non‑QV questions: `MultiQuestionSurveyPage` → `buildNonQvBatchPayload`

Approval-specific notes:
- Submission payload is `{ responseContent: { approvals: string[] } }`.
- Backend normalizes by filtering unknown optionIds + deduping.
- Effective approval cap uses unlimited/custom/default-K rules; over-cap payloads are rejected with `400`.

Storage behavior (backend):
- **QuestionResponses** store per‑question content.
- **SurveyResponses** store navigation snapshot (`qvNavigator`, etc.) and
  provide a survey‑level view of progress.
- **SurveyResponses** are the aggregate root for anonymous participation. They
  store generated `uuid`, optional distributed `sKey`/`uKey`, status, and
  answered `questionResponses`. See
  `architecture/anonymous-capability-survey-flow.md` for the canonical model.

4) Results for Designers
------------------------
Protected endpoint:
- `GET /api/v1/protected/surveys/:surveyId/results?questionId=...`
  - Pagination: `limit`, `cursor`/`nextCursor`
  - Filters: `status`, `asOf`

Frontend entry:
- `client/src/pages/designer/SurveyResultsPage.tsx`

Key behaviors:
- Results are computed on demand from `QuestionResponses` + `SurveyResponses`.
- Mismatched `questionId` payloads are guarded (client logs + error).

5) Results for Respondents (Submitter View)
-------------------------------------------
Public endpoint:
- `GET /api/v1/survey/responses/:uuid/results`
- `GET /api/v1/survey/responses/:uuid/results/questions`

Frontend entry:
- `client/src/pages/survey/components/SubmittedResultsSection.tsx`

Notes:
- This view reuses the same visualization components as the designer view.
- Text block questions are excluded from results.
- Participant completed-results access is `uuid`-centered. The backend resolves
  stored `sKey`, `uKey`, completion status, and answered question mapping from
  `SurveyResponse`; the participant UI should not pass `sKey`/`uKey` for
  completed-results requests.

6) Special Question Types
-------------------------
Approval
- Runtime semantics are up-to-K (not strict/exact K).
- Frontend and backend both resolve effective K with the same rule family (unlimited, explicit max, default).
- Results support approval-specific `Dots / Chart / Table` modes; breakdown panel is skipped for approval.
- See `docs/developer/frontend/approval-voting.md` for canonical details.

Text Block
- Stored as `type: 'text_block'` in the questions collection.
- Content is sanitized on the server (`CreateTextBlockQuestionDto`).
- Rendered in non‑QV modules via `HtmlContent`.

Selection
- Stored as `type: 'selection'`.
- Config:
  - `selectionMode`: `single` or `multi`
  - `displayControl`: `radio`, `dropdown`, `auto`, or `checkbox` (multi)
  - `minSelections`, `maxSelections` (multi only)
  - `controlRuleThresholds.singleToDropdownAt` for `displayControl=auto`
- Validations enforced server‑side and mirrored client‑side.

Related Docs
------------
- Backend question invariants: `backend/questions-backend.md`
- Frontend survey orchestration: `frontend/survey-frontend.md`
- Approval end-to-end: `frontend/approval-voting.md`
- Unified responses state: `frontend/unified-responses.md`
- Results visualization: `results/results-visualization.md`
- Anonymous capability survey flow: `architecture/anonymous-capability-survey-flow.md`
