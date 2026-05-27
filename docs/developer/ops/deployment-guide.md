Deployment Guide
================

Purpose
-------
- Explain the production build pipeline and runtime expectations.
- Document how frontend assets are packaged with the backend.
- Cross‑reference secret management requirements.

Production Build Flow
---------------------
The backend serves the compiled SPA from `server/build`.

Typical flow:
1) Build frontend:
   - `cd client && npm run build`
2) Copy build output:
   - `rsync -a client/build/ server/build/`
3) Build backend:
   - `cd server && npm run build`
4) Run backend:
   - `cd server && npm run start:prod`

Notes:
- `server/build` should **not** be committed to git.
- In production, the backend serves both API and SPA routes.

Runtime Configuration
---------------------
Backend uses `ConfigModule`:
- `NODE_ENV=production`:
  - env files are ignored
  - all env vars must be set by the runtime

Required env vars (see also `ops/env-and-secrets.md`):
- `MONGO_URI`
- `GOOGLE_CLIENTID`
- `GOOGLE_SECRET`
- `SECRET`
- `REDIRECT_URL`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`

Optional env vars:
- `JWT_REFRESH_THRESHOLD` (default: `0.3`)
- `PORT` (default: `6060`)
- `ENABLE_DEBUG_LOGS` (default: enabled outside production, disabled when `NODE_ENV=production`)
- `ENABLE_SWAGGER` (default: enabled outside production, disabled when `NODE_ENV=production`)
- `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_AUTH_WINDOW_MS`
- `RATE_LIMIT_PROTECTED_WRITE_MAX`, `RATE_LIMIT_PROTECTED_WRITE_WINDOW_MS`
- `RATE_LIMIT_PUBLIC_READ_MAX`, `RATE_LIMIT_PUBLIC_READ_WINDOW_MS`
- `RATE_LIMIT_PUBLIC_SUBMIT_MAX`, `RATE_LIMIT_PUBLIC_SUBMIT_WINDOW_MS`
- `RATE_LIMIT_PUBLIC_SUBMIT_IP_MAX`, `RATE_LIMIT_PUBLIC_SUBMIT_IP_WINDOW_MS`
- `RATE_LIMIT_TRUST_PROXY` (disabled by default; set for managed proxy deployments)

Production debug/API-doc guardrails:
- Keep `ENABLE_DEBUG_LOGS` and `ENABLE_SWAGGER` unset or explicitly `false` for normal production deployments.
- Set either flag to `true`, `1`, `yes`, or `on` only for a temporary production investigation.
- `REACT_APP_DEBUG_LOGS` is a frontend build-time flag; changing it in the runtime environment will not change already-built client assets.

Managed Runtime / Secret Store Notes
------------------------------------
See `ops/env-and-secrets.md` for full details. Key guardrails:
- Keep the runtime secret list complete on each deploy. Some platforms replace
  the full secret/env list for a revision instead of merging partial updates.
- Update deployment configuration when new required env vars are added.
- Ensure the runtime identity has permission to read the configured secrets.
- Set `ALLOWED_ORIGINS` to exact browser origins only, e.g. `https://example.com`.
- Do not add debug/API-doc flags to the secret store; they are plain runtime env vars.
- Rate-limit overrides are also plain runtime env vars, not secrets.
- Configure `RATE_LIMIT_TRUST_PROXY` for managed proxy deployments so forwarded client IPs work correctly for rate limiting. Leave it unset for direct local/runtime deployments.

Serving & Routing
-----------------
- Static assets are served from `server/build`.
- Non‑API routes fallback to `index.html` so React Router works.
- API routes live under `/api/v1/*`.

Related Docs
------------
- Local setup: `setup/local-development.md`
- Auth & security: `security/auth-security.md`
