#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

client_notices="$tmp_dir/client-notices.txt"
server_notices="$tmp_dir/server-notices.txt"

cd "$repo_root"

if [[ ! -d client/node_modules || ! -d server/node_modules ]]; then
  printf '%s\n' 'Missing dependency installs. Run `npm ci` in both client/ and server/ before regenerating notices.' >&2
  exit 1
fi

npx --yes license-checker --production --out "$client_notices" --start client
npx --yes license-checker --production --out "$server_notices" --start server

sanitize_notices() {
  awk -v root="$repo_root/" '{ gsub(root, ""); print }' "$1"
}

{
  printf '%s\n' 'Third-Party Notices'
  printf '%s\n\n' '==================='
  printf '%s\n' 'This file lists production dependency license notices generated from the client and server package trees.'
  printf '%s\n\n' 'Third-party dependencies retain their own licenses.'
  printf '%s\n' 'Client Production Dependencies'
  printf '%s\n\n' '------------------------------'
  sanitize_notices "$client_notices"
  printf '\n%s\n' 'Server Production Dependencies'
  printf '%s\n\n' '------------------------------'
  sanitize_notices "$server_notices"
} > THIRD_PARTY_NOTICES.txt
