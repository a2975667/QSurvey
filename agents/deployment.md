# Deployment to GCP (CI/CD) — Option A Checklist

Monorepo layout:
- `client/` — React SPA (Node 20)
- `server/` — NestJS API (Node 20) serving SPA from `build/`

We will deploy a single Cloud Run service where the server serves the built client.

## Status Checklist (Option A — Single Cloud Run)

Repo & Build Artifacts
- [x] Multi-stage Docker build for client + server (serves client from `build/`) — `Dockerfile`
- [x] `.dockerignore` excludes deps/build/logs — `.dockerignore`
- [x] Cloud Build config builds, pushes, deploys to Cloud Run — `cloudbuild.yaml`
  - [x] Enable Secret Manager integration for `MONGO_URI` (`--set-secrets`)
  - [x] Add Cloud Run resource flags (e.g., `--min-instances=1`, `--memory=1Gi`)
- [~] GitHub Actions workflow dispatch + on push to `main` triggers Cloud Build — `.github/workflows/deploy.yml`
  - [ ] Configure repo secrets: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`
  - [ ] Configure repo variables: `GCP_PROJECT`, `GCP_REGION`

Application Readiness
- [x] Static SPA serving + SPA fallback for non-`/api/**` routes — `server/src/main.ts`, `server/src/app.module.ts`
- [x] Port handling uses `process.env.PORT || 6060` — `server/src/main.ts`
- [x] Client API base uses same-origin `/api/v1` in production — `client/src/config.ts`
- [x] Mongo connection via `MONGO_URI` env — `server/src/app.module.ts`
- [x] CORS enabled for demo; cookies allowed — `server/src/main.ts`

GCP Project Setup (one-time)
- [ ] Enable APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager, IAM Credentials
- [ ] Create Artifact Registry Docker repo `qsurvey-online` in `$REGION`
- [ ] Create Secret Manager secret `MONGO_URI` and add value
- [ ] Cloud Build SA roles (project): Artifact Registry Writer, Cloud Run Admin, Service Account User, Secret Manager Secret Accessor
- [ ] GitHub OIDC deployer SA + Workload Identity Federation provider
  - [ ] Create SA (e.g., `github-deployer@$PROJECT.iam.gserviceaccount.com`)
  - [ ] Grant roles: Cloud Build Editor, Artifact Registry Writer, Cloud Run Admin, Service Account User
  - [ ] Configure WIF provider and trust relationship for this repo
  - [ ] Add repo secrets/vars: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT`, `GCP_REGION`
- [ ] Cloud Run runtime SA (optional explicit) with Secret access (to read `MONGO_URI`)
- [ ] Domain mapping (optional for demo)

Cloud Build Deploy Configuration
- [x] Update `cloudbuild.yaml` deploy step with:
  - `--set-secrets=MONGO_URI=projects/$PROJECT_ID/secrets/MONGO_URI:latest`
  - `--min-instances=1`
  - `--memory=1Gi` (tune as needed)
  - Optional: `--service-account=RUN_RUNTIME_SA`
- [x] Verify image path: `$_REGION-docker.pkg.dev/$PROJECT_ID/qsurvey-online/qsurvey-online:$TAG`
  - Note: custom substitutions must start with `_`. Use `_REGION` when invoking `gcloud builds submit`.

Post‑Deploy Verification
- [ ] Root URL serves SPA (index.html)
- [ ] Swagger available at `/api`
- [ ] DB connectivity OK (no connection errors in logs)
- [ ] Basic survey flow works (create/view/respond)
- [ ] Logs clean (no noisy debug for demo)

## Why Option A
- Server already serves static assets with SPA fallback — one image and one service to manage.
- Easiest to roll out for the demo; split hosting can be added later if needed.

## Files in Repo
- `Dockerfile` — multi-stage build: client → server → runtime; exposes `6060`.
- `.dockerignore` — excludes node_modules, build artifacts, logs, editor files.
- `cloudbuild.yaml` — builds, pushes, and deploys to Cloud Run.
- `.github/workflows/deploy.yml` — GitHub Actions → Cloud Build with substitutions.

## Option B — Split Hosting (Reference Only)
- Client on GCS + Cloud CDN; API on Cloud Run; client uses relative `/api/v1` base.
- Use only if you need separate scaling/hosting for SPA.

## Commands Cheat Sheet (GCP one‑time)
```
# Artifact Registry
gcloud artifacts repositories create qsurvey-online \
  --repository-format=docker --location $REGION

# Secret Manager
gcloud secrets create MONGO_URI --replication-policy=automatic
echo -n 'mongodb+srv://...' | gcloud secrets versions add MONGO_URI --data-file=-

# (Optional) grant Cloud Build SA access to secrets
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUDBUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/secretmanager.secretAccessor"
```

## Notes
- For the demo, set `--min-instances=1` to reduce cold starts.
- Keep same-origin API base in production (`/api/v1`); no client rebuild needed for Cloud Run domain.
