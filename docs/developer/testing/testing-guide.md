Testing Guide
=============

Purpose
-------
- Standardize how tests are run locally and in CI.
- Document where tests live and which layers they cover.

General Rules
-------------
- Always run tests with **CI mode enabled**:
  - `CI=true ...`
- Run tests from the **package root** (`client/` or `server/`), not the repo root.

Frontend Tests (client)
-----------------------
Location:
- `client/src/**/__tests__/*.test.tsx`
- `client/src/**/*.test.tsx`

Run all tests:
- `cd client && CI=true npm test -- --runInBand`

Run a focused test:
- `cd client && CI=true npm test -- <pattern> --runInBand`

Notes:
- Uses CRA test runner (`react-scripts test`).
- Tests often rely on Redux store setup and mock fetch calls.

Backend Tests (server)
----------------------
Location:
- `server/src/**/*.spec.ts`

Run all tests:
- `cd server && CI=true npm test -- --runInBand`

Run a focused test:
- `cd server && CI=true npm test -- <pattern> --runInBand`

E2E tests:
- `cd server && CI=true npm run test:e2e`
- E2E tests in `server/test/*.e2e-spec.ts` typically mock providers and
  do **not** require a live MongoDB connection.

Coverage:
- `cd server && CI=true npm run test:cov`

Common Failure Causes
---------------------
- Missing env vars in server tests (rare; most unit tests mock providers).
- Snapshot or async timing issues in client tests (use `--runInBand`).
- Incorrect auth state setup in frontend tests (mock Redux auth slice).

Related Docs
------------
- Auth + security behavior: `security/auth-security.md`
- Survey flows (frontend): `frontend/survey-frontend.md`
- Backend question invariants: `backend/questions-backend.md`
