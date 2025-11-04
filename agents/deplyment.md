# Deployment to GCP (CI/CD)

This repo is a monorepo with two apps:

- `client/` — React SPA built with `react-scripts` (Node 20)
- `server/` — NestJS API (Node 20) with `@nestjs/serve-static` already wired to serve a `build/` folder

Given the current server’s static serving setup:

- MOST pragmatic option: build both apps into a single container image, copy the client build into `server/build`, and run the Nest server on Cloud Run.
- Alternative: host the client on Cloud Storage + Cloud CDN and deploy only the API to Cloud Run. You can migrate to this later if needed.

## Option A — Single Cloud Run service (server serves client)

Why this

- Server already serves static assets and has SPA routing fallback.
- One artifact to build, ship, and roll back.

Flow

1) Multi-stage Docker build produces a single image
2) Push to Artifact Registry
3) Deploy to Cloud Run (fully managed)

Files in repo root

- `Dockerfile` — multi-stage build for client + server
- `.dockerignore` — keeps image lean
- `cloudbuild.yaml` — Cloud Build config to build/push/deploy
- `.github/workflows/deploy.yml` — optional GitHub Actions workflow calling Cloud Build

Cloud Run deploy notes

- Set env vars/secrets at deploy time; prefer Secret Manager, e.g. `MONGO_URI`.
- Expose port `6060`; service listens on `process.env.PORT || 6060`.
- Domain mapping and HTTPS via Cloud Run (or a Load Balancer + Cloud CDN).

## Option B — Split hosting (client on GCS+CDN, API on Cloud Run)

- Build client in CI and upload to a GCS bucket (configure `Cache-Control`).
- Serve via HTTPS Load Balancer + Cloud CDN.
- Build and deploy API as a separate Cloud Run service.
- Configure `client/src/config.ts` to use a relative base (`/api/v1`) or a build-time env like `REACT_APP_API_PREFIX`.

## Local dev (optional Docker Compose)

If desired, you can add a simple `docker-compose.yml` with MongoDB and the app for local parity.

## Recommendation

Adopt Option A now (single Cloud Run service). Third parties can run the same image with their own `MONGO_URI` and secrets without code changes.

