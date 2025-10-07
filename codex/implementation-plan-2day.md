# QS Refactor Plan (2 Days)

Time-boxed plan to combine server and client cleanly, reduce research-era residues, keep UI unchanged (logic-only), add guardrail tests, and update docs lightly along the way. No production customers; no legacy support retained.

## Constraints

- No FE layout/component/CSS changes — logic-only updates
- No legacy support — remove deprecated/experimental routes and files
- Single origin — backend serves API + SPA
- Light documentation updates
- Add unit/e2e tests for core paths

## Complexity

- Moderate. With no UI and no legacy support, a focused 2-day push is feasible. Main risk areas: SPA fallback correctness, cookie/CORS in dev, and DTO coverage breadth.

## Deliverables

- Dev/prod single-origin: relative API base `'/api/v1'`; CRA proxy in dev
- Unified SPA fallback (one implementation only)
- Backend DTO validation for core write endpoints; guards replace path prefixes
- Centralized auth bootstrap (`/auth/me` + refresh semantics)
- Frontend logic via RTK Query for auth/survey/response calls (no visual changes)
- Light docs and a small set of tests (backend unit/e2e + frontend RTK Query/store)

## Day 1 — Routing, Config, Auth Bootstrap

- Dev Proxy + Relative API Base
  - Add CRA proxy: `"proxy": "http://localhost:6060"` in `client/package.json`
  - Use `'/api/v1'` in `client/src/config.ts` (or `REACT_APP_API_BASE` defaulting to `'/api/v1'`)
  - Acceptance: Dev calls go through proxy without CORS; same bundle works in prod

- SPA Fallback Simplification
  - Choose one approach only:
    - Keep Express middleware in `server/src/main.ts` and remove `server/src/frontend.controller.ts`, or
    - Keep `FrontendController` and remove custom SPA middleware
  - Ensure `ServeStaticModule` serves assets and non-API GETs return `index.html`
  - Acceptance: Direct nav to `/designer`, `/survey/:id` serves SPA; `/api/v1/*` is never intercepted

- CORS Scope
  - Restrict `app.enableCors` to development; rely on CRA proxy for cookies in dev
  - Acceptance: No dev CORS errors; prod doesn’t rely on permissive CORS

- Auth Bootstrap Unification
  - Add `GET /api/v1/auth/me` returning current user from cookies
  - Keep `/auth/refresh` for rotation; document semantics
  - Frontend: Replace scattered bootstrap logic with one centralized call
  - Acceptance: On app mount, auth rehydrates with one call; no duplicate refreshes

- Light Docs (Day 1)
  - Update `README.md` and this plan for dev proxy, API base, SPA fallback rationale

- Tests (Day 1)
  - Backend unit: `auth/me` controller — authenticated/unauthenticated responses
  - Backend e2e: SPA fallback — non-API route returns `index.html`
  - Frontend: auth bootstrap smoke using mocked fetch/RTK Query

## Day 2 — DTOs, Guards, RTK Query, Cleanup

- DTO Validation + Guards
  - Add/complete DTOs with `class-validator` for key write endpoints:
    - Surveys: create/update/publish
    - Questions: create/update
    - Responses: create/submit/close
  - Replace `/protected/*` path prefixes with `@UseGuards` (roles/ownership)
  - Address high-value TODOs (e.g., duplicate answer validation)
  - Acceptance: Invalid payloads → 400 with clear messages; authZ via guards

- Frontend Logic Consolidation (No UI changes)
  - Expand `client/src/app/surveyApi.ts` (or split to `authApi`, `responseApi`) to cover auth/surveys/responses
  - Replace simple `apiFetch` call sites with RTK Query hooks where straightforward
  - Remove `'/legacy'` route and `_deprecated_*` files (no legacy support)
  - Acceptance: Network calls originate from RTK Query; app compiles; routes function unchanged visually

- Tests (Day 2)
  - Backend unit: DTO validation tests (valid/invalid cases) for endpoints above
  - Backend e2e: happy-path flows (survey create→get, response create→submit) with guards active
  - Frontend: RTK Query integration with MSW for survey fetch and response submit; reducers smoke tests

- Light Docs (Day 2)
  - Brief notes in `docs/` about DTOs, guard usage, and RTK Query conventions

## Acceptance Criteria (Overall)

- Dev: CRA proxies to Nest API; no CORS issues; cookies flow
- Prod-like local: SPA build served by backend; API routes under `'/api/v1'`
- Legacy removed: no `/legacy` route; deprecated files deleted
- DTO validation on core writes; guards replace path prefixes
- Frontend logic uses RTK Query for API; no UI regressions
- Tests: small but meaningful set passes locally (backend unit/e2e, frontend RTK/store)
- Docs updated to reflect new flow

## Out of Scope (for this 2-day window)

- OpenAPI code generation and shared package
- Deployment pipeline revamp
- Non-critical TODOs and deep refactors outside core paths

## File Touch List (Guidance Only)

- Client
  - `client/package.json` — add proxy
  - `client/src/config.ts` — relative API base
  - `client/src/app/surveyApi.ts` — extend endpoints (or add `authApi`/`responseApi`)
  - Replace simple `apiFetch` usage in pages with RTK Query hooks
  - Remove `'/legacy'` route from `client/src/App.tsx` and delete `_deprecated_*` files
- Server
  - `server/src/main.ts` and/or `server/src/frontend.controller.ts` — pick one SPA fallback
  - `server/src/app.module.ts` — ServeStaticModule config
  - `server/src/auth/auth.controller.ts` — add `GET /auth/me`
  - `server/src/**` — add DTOs/guards across surveys, questions, response
- Tests
  - Backend: unit + minimal e2e under `server/test/`
  - Frontend: RTK Query/store tests under `client/src/__tests__/` or colocated

---

This 2-day plan complements the longer-term roadmap in `docs/implementation-plan.md` and supersedes its multi-week timeline.

