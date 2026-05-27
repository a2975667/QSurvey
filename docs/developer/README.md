Developer Documentation
=======================

This directory contains developer-focused documentation for the QV System.
Each document is a focused "page" that explains an area of the codebase or a
set of invariants that contributors must preserve.

Structure
- `README.md`: This file; explains how the developer docs are organized.
- `setup/local-development.md`: Local dev setup (env vars, install, run).
- `architecture/system-overview.md`: High-level architecture map.
- `architecture/data-flow.md`: End-to-end data flows (survey -> responses -> results).
- `architecture/anonymous-capability-survey-flow.md`: Canonical `uuid`/`sKey`/`uKey` model for anonymous survey entry, response identity, and participant completed-results access.
- `security/auth-security.md`: Google OAuth + JWT flow, refresh behavior, RBAC.
- `testing/testing-guide.md`: How to run tests (CI mode, unit/e2e).
- `backend/questions-backend.md`: Backend questions model & creation flow, including
  how questions relate to surveys and how new question types should be added.
- `backend/id-conventions.md`: ID/ObjectId handling across backend and frontend,
  plus normalization patterns and pitfalls.
- `backend/survey-clone-flow.md`: Protected survey deep-clone flow, atomic transaction behavior, and invariants.
- `frontend/survey-frontend.md`: Respondent flow composition, page modules, and
  how the survey UI is assembled.
- `frontend/approval-voting.md`: End-to-end approval voting behavior across authoring,
  respondent flow, backend validation, and results views.
- `frontend/markdown-content-rendering.md`: Shared renderer contract for
  author-provided Markdown/HTML/text content, including current surface audit
  and migration rules.
- `frontend/safari-submit-quota-exceeded.md`: Runbook for Safari
  `QuotaExceededError` submit failures tied to client telemetry storage behavior.
- `frontend/unified-responses.md`: Frontend answer state, QV navigation, and
  submission builders.
- `frontend/header-footer-layout.md`: App shell, header/footer patterns, breadcrumbs,
  and survey exit controls.
- `frontend/debugging-surveys.md`: Debugging recipes and cross-links for survey issues.
- `results/results-visualization.md`: Results views (designer/submitter), filtering
  invariants, panel layout, and metrics shown in the UI.
- `results/designer-results-style.md`: UI notes for designer results (headers,
  metrics, toggles, tooltips, filtering guards, tests).
- `results/results-breakdown-divergence-ordering.md`: Results breakdown ordering
  notes for divergence/variance-first displays.
- `ui/qv-css-overview.md`: Cheatsheet for QV/QS UI CSS (bins/organize, vote cards,
  dropdowns, responsive behaviors).
- `ui/ui-tokens.md`: Design language for color/surfaces in QV/QS (semantic roles,
  current families, and guidance for future tokenization).
- `ui/ui-design-system.html`: Canonical palette, roles, buttons, chips, sections,
  and UI examples.
- `ops/deployment-guide.md`: Build + deploy flow for production.
- `ops/env-and-secrets.md`: Deployment env/secret guardrails and required
  production variables.

Conventions
- Keep documents concise but precise; focus on invariants, flows, and "do/do not" guidance.
- Prefer concrete file/path references so readers can jump into the code.
- When changing core flows (e.g., question creation, survey update, response
  pipelines, auth/security), update or add a page here as part of the change.
- If a doc becomes too long, split it by domain and update this index.
