Local Development Setup
=======================

Purpose
-------
- Get a full local dev environment running (frontend + backend + Mongo).
- Explain where environment variables live and how auth works locally.
- Provide a reliable checklist for new contributors.

Repo Layout (quick)
------------------
- `client/` — React (CRA) frontend.
- `server/` — NestJS backend; also serves the production SPA from `server/build`.
- `docs/developer/` — authoritative developer docs (this folder).

Prerequisites
-------------
- Node.js **>= 20** (per `client/package.json` and `server/package.json`).
- npm (use npm for all commands).
- MongoDB (local or hosted).
- Google OAuth credentials (client ID/secret) for authenticated designer routes.

Install Dependencies
--------------------
There is **no** root install. Install per package:
1) `cd server && npm install`
2) `cd client && npm install`

Backend Environment
-------------------
Backend config is loaded via `ConfigModule` in `server/src/app.module.ts`:
- In **development** (`NODE_ENV !== 'production'`):
  - Reads `server/.env.development`
- In **production** (`NODE_ENV=production`):
  - Ignores env files; expects real environment variables

Required variables (server):
- `MONGO_URI` — Mongo connection string
- `GOOGLE_CLIENTID` — Google OAuth client ID
- `GOOGLE_SECRET` — Google OAuth client secret
- `SECRET` — JWT signing secret
- `REDIRECT_URL` — OAuth callback URL (must match Google console config)
- `FRONTEND_URL` — frontend origin used for post-login redirect
- `ALLOWED_ORIGINS` — comma-separated exact browser origins allowed by CORS

Optional server variables:
- `JWT_REFRESH_THRESHOLD` — fraction of token lifetime left before refresh (default `0.3`)
- `PORT` — server port (defaults to `6060`)

Example `server/.env.development`:
```
MONGO_URI=mongodb://localhost:27017/qv_dev
GOOGLE_CLIENTID=...
GOOGLE_SECRET=...
SECRET=...
REDIRECT_URL=http://localhost:6060/api/v1/redirect
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
JWT_REFRESH_THRESHOLD=0.3
```

Frontend Environment
--------------------
Frontend API base is controlled by `client/src/config.ts`:
```
export const API_PREFIX =
  process.env.REACT_APP_API_PREFIX ||
  (process.env.NODE_ENV === 'production'
    ? '/api/v1'
    : 'http://localhost:6060/api/v1');
```
Notes:
- There is **no CRA proxy** configured; local dev uses the explicit backend origin.
- Use `REACT_APP_API_PREFIX` only if you need a non-default backend URL.

Run in Development
------------------
Backend (NestJS):
- `cd server && npm run start:dev`
- Default: `http://localhost:6060`
- Swagger: `http://localhost:6060/api`

Frontend (CRA):
- `cd client && npm start`
- Default: `http://localhost:3000`

Login / Auth (local)
--------------------
Google OAuth login is required for designer pages:
- Frontend login button redirects to:
  - `GET /api/v1/google-login`
- OAuth callback hits:
  - `GET /api/v1/redirect`
- Backend redirects to:
  - `${FRONTEND_URL}/login-success?token=...&email=...&userId=...&roles=...`
- `client/src/App.tsx` handles `/login-success` and stores the JWT in localStorage.

If Google OAuth is not configured:
- Public survey taking still works (`/survey/:id`).
- Protected designer routes will redirect to `/`.

Production Build (local sanity check)
------------------------------------
The backend serves the production SPA from `server/build`.
Typical flow:
1) `cd client && npm run build`
2) Copy build to server:
   - `rsync -a client/build/ server/build/`
3) `cd server && npm run build && npm run start:prod`

Common Gotchas
-------------
- Port conflicts:
  - Frontend expects `3000`; backend defaults to `6060`.
- OAuth redirect mismatch:
  - `REDIRECT_URL` and `FRONTEND_URL` must match Google console settings.
- CORS origin mismatch:
  - `ALLOWED_ORIGINS` must include the browser origin serving the frontend, e.g. `http://localhost:3000`.
- API base mismatch:
  - `client/src/config.ts` must point to the running backend.
- Mongo connection errors:
  - Verify `MONGO_URI` and access to the Mongo instance.
- Dependency issues:
  - Delete `client/node_modules` or `server/node_modules` for the failing
    package, then reinstall with `npm install` in that package directory.
