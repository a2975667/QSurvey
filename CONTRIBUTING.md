# Contributing

- Run relevant tests before opening a PR.
- Install tracked git hooks with `./scripts/install-git-hooks.sh`.
- If you change runtime dependencies in `client/` or `server/`, run `./scripts/generate-third-party-notices.sh` and commit the updated `THIRD_PARTY_NOTICES.txt`.
- The tracked `pre-push` hook regenerates `THIRD_PARTY_NOTICES.txt` when pushed commits change `client/package.json`, `client/package-lock.json`, `server/package.json`, or `server/package-lock.json`, and blocks the push until the regenerated notices are committed.
