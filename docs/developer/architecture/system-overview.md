System Overview
===============

Purpose
-------
- Provide a high‑level architectural map for maintainers and new contributors.
- Explain the major services, data stores, and invariants that must be preserved.

Top‑Level Architecture
----------------------
- **Frontend**: React (CRA + TypeScript) in `client/`.
- **Backend**: NestJS in `server/`.
- **Data store**: MongoDB.
- **Serving model (production)**:
  - Backend serves API and static SPA from `server/build`.
  - SPA routing is handled by the backend + Express fallback.

Runtime Boundaries
------------------
- API base: `/api/v1`
- Public endpoints: `api/v1/...` (no auth)
- Protected endpoints: `api/v1/protected/...` (JWT + role guards)

Key Modules (backend)
---------------------
- **Auth**: `server/src/auth/*`
  - Google OAuth + JWT auth/refresh headers.
- **Users**: `server/src/users/*`
  - User profiles, role enforcement.
- **Surveys**: `server/src/surveys/*`
  - Survey CRUD, collaborators, results, exports.
- **Questions**: `server/src/questions/*`
  - QV, Likert, Text, Approval, Selection, Text Block.
- **Responses**: `server/src/response/*`
  - Question responses + survey response snapshots.
- **Core**: `server/src/core/*`
  - Shared data access, invariants, and ID normalization.

Data Model (Mongo)
------------------
Primary collections and schema sources:
- **Users**
  - Schema: `server/src/users/schemas/user.schema.ts`
- **Surveys**
  - Schema: `server/src/surveys/schemas/survey.schema.ts`
  - `survey.questions` is the authoritative ordering of question IDs.
- **Questions**
  - Unified collection: `questions`
  - Schemas: `server/src/questions/schemas/**` (all types in one collection)
- **QuestionResponses**
  - Schema: `server/src/response/schemas/questionResponse.schema.ts`
- **SurveyResponses**
  - Schema: `server/src/response/schemas/surveyResponse.schema.ts`

Frontend Architecture (high level)
----------------------------------
- Routing: `client/src/App.tsx`
  - Public: `/`, `/login`, `/survey/:id`
  - Protected: `/designer`, `/survey/:id/edit`, `/designer/results/:surveyId`
- State:
  - Redux slices under `client/src/features/`
  - Unified response state in `client/src/features/unifiedResponsesSlice.ts`
- Survey rendering:
  - Orchestrator: `client/src/pages/survey/SurveyView.tsx`
  - Modules:
    - QV: `QuadraticSurveyPage`
    - Approval: `ApprovalSurveyPage`
    - Non‑QV: `MultiQuestionSurveyPage` (Text, Likert, Selection, Text Block)

Core Invariants (must preserve)
-------------------------------
- **Single questions collection**:
  - All question types live in Mongo collection `questions`.
- **Survey question ordering**:
  - `survey.questions` is the source of truth for order.
- **ID integrity**:
  - Never regenerate question IDs when updating `survey.questions`.
  - Use persisted `_id` values from Mongo.
- **Results are computed on demand**:
  - There is no pre‑aggregated results store.

Where to Look Next
------------------
- Backend questions flow: `backend/questions-backend.md`
- ID handling: `backend/id-conventions.md`
- Frontend survey orchestration: `frontend/survey-frontend.md`
- Unified responses state: `frontend/unified-responses.md`
- Results visualization: `results/results-visualization.md`
- Auth & security: `security/auth-security.md`
