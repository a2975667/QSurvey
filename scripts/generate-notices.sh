#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_NOTICES="$(mktemp)"
SERVER_NOTICES="$(mktemp)"

cleanup() {
  rm -f "$CLIENT_NOTICES" "$SERVER_NOTICES"
}
trap cleanup EXIT

npx license-checker --production --out "$CLIENT_NOTICES" --start "$ROOT_DIR/client"
npx license-checker --production --out "$SERVER_NOTICES" --start "$ROOT_DIR/server"

if [[ ! -s "$CLIENT_NOTICES" || ! -s "$SERVER_NOTICES" ]]; then
  echo "Failed to generate dependency notices from client/server package trees." >&2
  exit 1
fi

ESCAPED_ROOT="$(printf '%s\n' "$ROOT_DIR" | sed 's/[][(){}.^$*+?|\\/]/\\&/g')"

{
  echo "Third-Party Notices"
  echo "==================="
  echo
  echo "This file lists production dependency license notices generated from the client and server package trees."
  echo "Third-party dependencies retain their own licenses."
  echo
  echo "Client Production Dependencies"
  echo "------------------------------"
  echo
  cat "$CLIENT_NOTICES"
  echo
  echo
  echo "Server Production Dependencies"
  echo "------------------------------"
  echo
  cat "$SERVER_NOTICES"
} | sed "s|$ESCAPED_ROOT/||g" > "$ROOT_DIR/THIRD_PARTY_NOTICES.txt"
