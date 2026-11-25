#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
context="$scratch/context"
mkdir "$context"
cp "$repo_root/.gcloudignore" "$repo_root/.dockerignore" "$context/"

excluded=(
  gha-creds-fixture.json server/gha-creds-fixture.json
  .shared/notes/private.md .codex/plans/item.md .claude/settings.json
  .agents/config.json agents/local.txt codex/local.txt AGENTS.md CLAUDE.md
  server/.env.local client/.env.local
)
included=(
  cloudbuild.yaml Dockerfile
  client/src/App.tsx client/package.json client/package-lock.json
  server/src/main.ts server/package.json server/package-lock.json
  server/src/agents/public.ts
)
for path in "${excluded[@]}" "${included[@]}"; do
  mkdir -p "$(dirname "$context/$path")"
  printf 'fixture\n' > "$context/$path"
done

check_manifest() {
  local manifest="$1"
  local path
  for path in "${excluded[@]}"; do
    if grep -Fxq "$path" "$manifest"; then
      echo "Unexpected file in $(basename "$manifest"): $path" >&2
      return 1
    fi
  done
  for path in "${included[@]}"; do
    if ! grep -Fxq "$path" "$manifest"; then
      echo "Missing file in $(basename "$manifest"): $path" >&2
      return 1
    fi
  done
}

CLOUDSDK_CONFIG="$scratch/gcloud-config" gcloud meta list-files-for-upload "$context" > "$scratch/upload-manifest"
check_manifest "$scratch/upload-manifest"

# Export only the fixture tree through the real Docker context filter.
docker buildx build --network none --file - --output "type=local,dest=$scratch/output" "$context" <<'DOCKERFILE'
FROM scratch
COPY . /
DOCKERFILE
(cd "$scratch/output" && find . -type f | sed 's|^\./||') > "$scratch/docker-manifest"
check_manifest "$scratch/docker-manifest"

# Packaging must leave the authentication file available on the runner.
grep -Fxq fixture "$context/gha-creds-fixture.json"
