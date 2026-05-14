# QSurvey System
![Client Tests](https://github.com/a2975667/QSurvey/actions/workflows/ci-tests.yml/badge.svg?branch=main&job=client-tests)
![Server Tests](https://github.com/a2975667/QSurvey/actions/workflows/ci-tests.yml/badge.svg?branch=main&job=server-tests)

Quadratic Survey system.

## Repository Structure

- `client/`: React application (Create React App + TypeScript)
- `server/`: NestJS API, also serves the compiled SPA from `server/build`

## Requirements

- Node.js v20+ (recommend using nvm)
- npm v8+
- MongoDB instance (connection string via `MONGO_URI`)
- Google OAuth credentials for login (client ID/secret, redirect URLs)

## Quick Start (Local Development)

1) Install dependencies

- `cd server && npm install`
- `cd client && npm install`

Note: There is no root-level install step. Dependencies live in `client/` and `server/` only.

2) Configure environment

- Server (NestJS): create `server/.env.development` for local dev and `server/.env.production` for prod values. Example for development:

  - `MONGO_URI=mongodb://localhost:27017/db` (or your Atlas URI)
  - `GOOGLE_CLIENTID=<your-google-client-id>`
  - `GOOGLE_SECRET=<your-google-secret>`
  - `SECRET=<jwt-secret>`
  - `REDIRECT_URL=http://localhost:6060/api/v1/redirect`
  - `FRONTEND_URL=http://localhost:3000`

- Client (React): API base is configured in `client/src/config.ts` and defaults to the relative path `'/api/v1'`. Set `REACT_APP_API_BASE` only if you need to override the default (e.g., staging). Avoid storing secrets in the frontend.

3) Run apps in development

- Backend: `cd server && npm run start:dev` (NestJS on http://localhost:6060)
- Frontend: `cd client && npm start` (CRA on http://localhost:3000)

The CRA dev server proxies `/api` requests to the backend (configured via `client/package.json`).

Local setup checklist
- MongoDB: ensure `MONGO_URI` in `server/.env.development` points at a reachable Mongo instance.
- OAuth: Google client/secret are required for login flows; for local-only testing without OAuth you can focus on survey flows that don’t require auth, but most routes expect valid credentials.
- Ports: backend listens on 6060, frontend on 3000 (proxy enabled).
- Tests: run from package roots with `CI=true npm test -- --runInBand` in `client/` or `server/` to mirror CI behavior.

## API and Routing

- API base: `/api/v1`
- Auth bootstrap: `GET /api/v1/auth/me`
- Swagger UI: `http://localhost:6060/api`
- SPA serving (production): the backend serves static assets from `server/build` and falls back to `index.html` for non-API routes.

## Build and Deploy

The deployment flow builds the frontend and places the assets into `server/build`, then builds and deploys the backend only.

1) Build frontend

- Option A (copy after build):
  - `cd client && npm run build`
  - `rsync -a client/build/ server/build/` (or `cp -r client/build/* server/build/`)

- Option B (output directly into server/build):
  - Create `client/.env.production` with `BUILD_PATH=../server/build`
  - Then run `cd client && npm run build` (artifacts land in `server/build`)

2) Build backend

- `cd server && npm run build`

3) Run production locally (optional)

- `cd server && npm run start:prod`

4) Deploy

- Deploy from `server/` only. The backend will serve both API and SPA.
- If using Google App Engine, set environment variables (Mongo, OAuth, etc.) and route all paths to the Node app. Alternatively, deploy to your preferred host or containerize with Docker.

Recommendation: do not commit `server/build` artifacts. Build them in CI or as part of your deploy process.

## Environment Variables

Server (read at runtime):

- `MONGO_URI`: MongoDB connection string
- `GOOGLE_CLIENTID`, `GOOGLE_SECRET`: Google OAuth credentials
- `SECRET`: JWT/signing secret
- `REDIRECT_URL`: OAuth callback URL, e.g., `http://localhost:6060/api/v1/redirect` (dev) or `https://<domain>/api/v1/redirect` (prod)
- `FRONTEND_URL`: Origin used for post-login redirect, e.g., `http://localhost:3000` (dev) or your site origin (prod)

Client:

- `client/src/config.ts` resolves the API base. By default it is `'/api/v1'`; optionally set `REACT_APP_API_BASE` for overrides.
- Google OAuth flow uses the backend origin. In development you can override it with `REACT_APP_BACKEND_ORIGIN` (defaults to `http://localhost:6060`).

## Scripts Reference

Client (React):

- `npm start`: run CRA dev server
- `npm run build`: build production assets to `client/build` (or to `server/build` if `BUILD_PATH` is set)
- `npm test`, `npm run eject`

Server (NestJS):

- `npm run start:dev`: run backend with HMR (webpack)
- `npm run build`: compile TypeScript to `dist`
- `npm run start:prod`: run compiled server (`node dist/main`)
- `npm run test`, `npm run test:e2e`, `npm run test:cov`, `npm run lint`, `npm run format`

## Notes

- Best practice: do not commit `server/build`; generate it during your manual release/build process.

## Troubleshooting

- Client routes 404 in production:
  - Ensure `server/build/index.html` exists and SPA fallback is active (it is configured in the backend)
- CORS errors in development:
  - Ensure the CRA proxy entry exists in `client/package.json`
- OAuth redirect issues:
  - Verify `FRONTEND_URL` and `REDIRECT_URL` match Google console configuration
- Mongo connection errors:
  - Check `MONGO_URI` and network reachability
- Frontend cannot reach API:
  - Confirm `client/src/config.ts` points to the correct base; or switch to `'/api/v1'` and use CRA proxy in dev

## Contributing

- Create feature branches and open PRs against `main`
- Run linters/tests locally before pushing
- Keep secrets out of commits
- See `CONTRIBUTING.md` for contribution checklist items, including third-party notice updates when dependencies change.

## License

This repository contains the reference implementation of the QSurvey System for
noncommercial research, education, and personal use. Commercial use of this
implementation requires prior written permission from the rights holder.

- Source code is licensed under the PolyForm Noncommercial License 1.0.0
  (`PolyForm-Noncommercial-1.0.0`); see `LICENSE`.
- README content, documentation, screenshots, figures, and design assets are
  licensed under Creative Commons Attribution-NonCommercial 4.0 International
  (CC BY-NC 4.0); see `LICENSE-DOCS.md`.
- Third-party dependencies retain their own licenses; see
  `THIRD_PARTY_NOTICES.txt`.
- If you use QSurvey as a survey tool, cite both "I can show what I really
  like.: Eliciting Preferences via Quadratic Voting" and "Organize, Then Vote:
  Exploring Cognitive Load in Quadratic Survey Interfaces", along with this
  repository using `CITATION.cff`.
