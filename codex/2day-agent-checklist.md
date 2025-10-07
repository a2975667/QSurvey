# QS 2-Day Execution Checklist and Agent Spec

Purpose: Execute the 2-day refactor plan with zero UI changes (logic-only), no legacy support, and light documentation + tests. This is an agent-friendly, checkbox-style spec with clear requirements and success metrics.
Important note: DO NOT RUN THE SERVER. I WILL HAVE IT RUNNING after you provide the running instructions during edits so i can follow and track.

## Scope & Constraints

- Keep existing UI layout/components/CSS unchanged — logic-only modifications.
- No legacy support — remove deprecated/experimental routes/files.
- Single-origin behavior: backend serves API + SPA; frontend uses relative API base.
- Light documentation updates only; do not over-document.
- Add a minimal but meaningful set of tests to guard regressions.

## Global Requirements (Definition of Done)

- Frontend uses a relative API base `"/api/v1"` in all environments.
- CRA dev server proxies to backend (no CORS errors; cookies flow in dev).
- Exactly one SPA fallback mechanism in the backend; non-API routes serve `index.html`.
- Backend write endpoints validate payloads via DTOs; access control enforced via guards (not path names).
- Auth bootstrap uses a single consolidated call (`GET /api/v1/auth/me`), with refresh retained for rotation.
- Legacy route(s) and deprecated files removed from the shipping app.
- Light docs updated in `README.md` and `codex/`.
- Tests: backend unit + e2e and frontend RTK Query/store tests pass locally.

## Success Metrics

- Dev proxy in effect: Network requests from the client in dev go to `http://localhost:3000/api/v1/...` and succeed via proxy without CORS warnings.
- SPA fallback: Navigating directly to `/designer` and `/survey/:id` returns SPA (status 200). Automated e2e test confirms.
- Auth bootstrap: `GET /api/v1/auth/me` returns 200 for authenticated user and is called once on app mount (no duplicate refresh calls in logs); unauthenticated returns 401/403 with clear body.
- DTO coverage: At least the following endpoints are validated with DTOs: surveys (create, update, publish), questions (create, update), responses (create, submit, close). Invalid payloads yield 400 with validation messages.
- Guards: Paths do not rely on `/protected` prefixes; role/ownership guards enforce access.
- Frontend logic: All new/updated network interactions use RTK Query; no direct `fetch`/custom wrappers remain in the touched surfaces.
- Tests: Minimum set present and passing locally:
  - Backend unit: ≥ 6 tests across auth/surveys/questions/responses DTOs/guards.
  - Backend e2e: ≥ 2 tests (SPA fallback; one happy-path survey/response flow).
  - Frontend: ≥ 2 RTK Query integration tests (survey fetch; response submit) + ≥ 1 reducer/store smoke.
- Legacy removal: `/legacy` route removed; `rg "_deprecated_"` returns no imports in production routes.

## Checklist (tick each item)

### Day 1 — Routing, Config, Auth Bootstrap

- [ ] Dev proxy configured: `client/package.json` includes `"proxy": "http://localhost:6060"`.
- [ ] Relative API base: `client/src/config.ts` uses `"/api/v1"` (or env with default to `"/api/v1"`).
- [ ] CORS constrained: backend CORS enabled only for development; cookies flow via dev proxy.
- [ ] SPA fallback unified: choose one approach (Express middleware OR FrontendController) and remove the other.
- [ ] ServeStaticModule configured: static assets served; non-API GETs return `index.html` cleanly.
- [ ] Auth endpoint: `GET /api/v1/auth/me` implemented to return current user from cookies.
- [ ] Frontend bootstrap unified to use a single call to `auth/me` (retain refresh for rotation; avoid POST/GET fallbacks).
- [ ] Light docs updated: dev proxy, API base, SPA fallback documented in `README.md` and `codex/`.
- [ ] Tests added:
  - [ ] Backend unit: `auth/me` responses (authed/unauthed).
  - [ ] Backend e2e: SPA fallback returns `index.html` for non-API path.
  - [ ] Frontend: auth bootstrap smoke using mocked API/RTK Query.

### Day 2 — DTOs, Guards, RTK Query, Cleanup

- [ ] DTO validation added for write endpoints:
  - [ ] Surveys: create
  - [ ] Surveys: update
  - [ ] Surveys: publish
  - [ ] Questions: create
  - [ ] Questions: update
  - [ ] Responses: create
  - [ ] Responses: submit
  - [ ] Responses: close
- [ ] Guards replace `/protected` path prefixes (role/ownership guards applied where needed).
- [ ] RTK Query consolidation:
  - [ ] Expand `surveyApi` or add `authApi`/`responseApi` covering auth/surveys/responses.
  - [ ] Replace direct fetch/custom wrapper call sites touched in this plan with RTK Query hooks (no UI changes).
- [ ] Remove legacy:
  - [ ] Remove `/legacy` route from client router.
  - [ ] Remove `_deprecated_*` components/files or move behind a feature flag excluded from production routes.
- [ ] Tests added:
  - [ ] Backend unit: DTO validation tests (valid/invalid) for endpoints above.
  - [ ] Backend e2e: happy-path flows (survey create→get; response create→submit) with guards active.
  - [ ] Frontend: RTK Query integration with MSW for survey fetch and response submit; reducers/store smoke.
- [ ] Docs: brief notes in `codex/` about DTOs, guards, and RTK Query conventions.

## Verification Steps

- Dev run: start backend (dev) and CRA (dev). Verify network calls use `/api/v1` with no CORS errors; cookies included.
- SPA fallback: hard-refresh on `/designer` and `/survey/:id` and confirm SPA loads. Verify automated e2e test.
- Auth bootstrap: observe only one `auth/me` call on mount; confirm correct behavior for authed/unauthed.
- DTOs/guards: send invalid payloads to each write endpoint and confirm 400 with messages; verify guard blocks unauthorized access.
- Tests: run backend unit/e2e and frontend tests; ensure green.
- Legacy cleanup: search for `/legacy` route and `_deprecated_` imports — none should be in production routes.

## Notes for Agents

- Do not modify UI visuals or CSS.
- Prefer small, isolated changes; remove dead code rather than commenting it out.
- Keep commit messages scoped to checklist items.
- Update docs lightly as items are completed (keep them short and practical).

