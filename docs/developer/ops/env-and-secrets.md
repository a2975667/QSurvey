Environment & Secret Notes
==========================

Context
-------
- Production deploys should supply secret values through the host platform's secret manager or environment variable mechanism.
- Some managed runtimes replace the entire secret/env list for a revision; omitting one required value (e.g., `SECRET`) will break the app (JwtStrategy error).
- In production (`NODE_ENV=production`), `.env` files are ignored; all values must be supplied by the runtime.

Key Vars (prod)
---------------
- `FRONTEND_URL`: Public origin used for post-auth redirect, e.g. `https://example.com`.
- `ALLOWED_ORIGINS`: Comma-separated exact browser origins allowed by CORS; include the production frontend origin.
- `REDIRECT_URL`: OAuth callback, e.g. `https://example.com/api/v1/redirect`.
- `MONGO_URI`, `GOOGLE_CLIENTID`, `GOOGLE_SECRET`, `SECRET`: Required for API auth/db.

Optional Vars
-------------
- `JWT_REFRESH_THRESHOLD`: fractional remaining lifetime before JWT auto‑refresh (default `0.3`).
- `PORT`: server port (default `6060`).
- `ENABLE_DEBUG_LOGS`: backend runtime flag for debug-shaped logs. Defaults to enabled outside production and disabled when `NODE_ENV=production`; production should normally leave it unset or set `false`.
- `ENABLE_SWAGGER`: backend runtime flag for Swagger UI/API docs at `/api`. Defaults to enabled outside production and disabled when `NODE_ENV=production`; production should normally leave it unset or set `false`.
- `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_AUTH_WINDOW_MS`: auth/OAuth limiter for `/api/v1/google-login` and `/api/v1/redirect` (defaults: `30` requests per `300000` ms per IP).
- `RATE_LIMIT_PROTECTED_WRITE_MAX` / `RATE_LIMIT_PROTECTED_WRITE_WINDOW_MS`: protected write/export limiter for `/api/v1/protected/*` non-read traffic plus export GETs (defaults: `300` requests per `900000` ms per JWT subject or IP fallback).
- `RATE_LIMIT_PUBLIC_READ_MAX` / `RATE_LIMIT_PUBLIC_READ_WINDOW_MS`: public survey fetch/results limiter for `/api/v1/surveys/*` and survey response GET routes (defaults: `1500` requests per `900000` ms per IP).
- `RATE_LIMIT_PUBLIC_SUBMIT_MAX` / `RATE_LIMIT_PUBLIC_SUBMIT_WINDOW_MS`: public survey submit/update/complete limiter for `/api/v1/survey/responses*` non-GET traffic (defaults: `5000` requests per `900000` ms per `survey:<surveyId>:<ipHash>` when `surveyId` is present).
- `RATE_LIMIT_PUBLIC_SUBMIT_IP_MAX` / `RATE_LIMIT_PUBLIC_SUBMIT_IP_WINDOW_MS`: public survey submit/update/complete IP-only limiter that caps traffic even when clients rotate survey IDs (defaults: `20000` requests per `900000` ms per `<ipHash>`).
- `RATE_LIMIT_TRUST_PROXY`: controls Express `trust proxy` for forwarded client IPs. Defaults to disabled; set to `1` for exactly-one-hop managed proxy deployments, or to another Express-compatible trust proxy value when appropriate.
- `REACT_APP_DEBUG_LOGS`: frontend build-time flag for client debug logging. It only affects builds produced with the value present; it is not a runtime toggle for already-built client assets.

Deployment Guardrails
---------------------
- Always include the full required secret/env list when deploying to platforms that replace revision configuration:
  - `MONGO_URI`, `GOOGLE_CLIENTID`, `GOOGLE_SECRET`, `SECRET`, `REDIRECT_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS`
- Add new required vars to deployment configuration so CI/CD preserves them.
- Ensure the runtime identity has permission to read configured secrets.
- Never log secrets in application logs or error traces.
- Use exact origins for `ALLOWED_ORIGINS`: scheme + host + optional port, no path and no wildcard.
- Keep production debug/API-doc flags unset or explicitly false unless temporarily investigating an issue. They are plain env vars, not secrets.
- When running behind a managed proxy, configure `RATE_LIMIT_TRUST_PROXY` so the rate-limit middleware keys on the forwarded client IP instead of the container-local address.
