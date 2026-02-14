#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO="${1:-.}"
WORKDIR="${2:-/tmp/qsurvey-sev1-rewrite-$(date +%Y%m%d%H%M%S)}"
REMOTE_NAME="${3:-origin}"
MIRROR_DIR="${WORKDIR}/rewrite.git"

LEAKED_PATH_A="server/.env.development"
LEAKED_PATH_B="server/.env.production"

mkdir -p "${WORKDIR}"

echo "Creating mirror clone at: ${MIRROR_DIR}"
git clone --mirror "${SOURCE_REPO}" "${MIRROR_DIR}"

cd "${MIRROR_DIR}"

if git filter-repo -h >/dev/null 2>&1; then
  echo "Using git filter-repo for history rewrite"
  git filter-repo --force \
    --path "${LEAKED_PATH_A}" \
    --path "${LEAKED_PATH_B}" \
    --invert-paths
else
  echo "git filter-repo not found; using git filter-branch fallback"
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force \
    --index-filter "git rm --cached --ignore-unmatch ${LEAKED_PATH_A} ${LEAKED_PATH_B}" \
    --prune-empty --tag-name-filter cat -- --all
fi

rm -rf refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

if git rev-list --objects --all | grep -E "${LEAKED_PATH_A}|${LEAKED_PATH_B}" >/dev/null; then
  echo "ERROR: leaked env paths are still present in rewritten refs."
  exit 1
fi

echo
echo "Rewrite complete and verified."
echo "Mirror path: ${MIRROR_DIR}"
echo
echo "Next commands (run manually after final review):"
echo "  cd ${MIRROR_DIR}"
echo "  git remote -v"
echo "  git push --force --all ${REMOTE_NAME}"
echo "  git push --force --tags ${REMOTE_NAME}"
