#!/usr/bin/env bash
# Install versioned git hooks by setting core.hooksPath to .githooks.
#
# Why:
# - `.git/hooks/*` is not committed; `.githooks/*` is.
# - Makes pre-commit/pre-push behavior consistent across clones.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ ! -d .githooks ]]; then
  echo "Missing .githooks/ (expected in repo root)."
  exit 1
fi

chmod +x .githooks/pre-commit .githooks/pre-push
git config core.hooksPath .githooks

echo "✅ Installed git hooks (core.hooksPath=.githooks)"

