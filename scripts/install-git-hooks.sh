#!/usr/bin/env bash
# Install versioned git hooks by setting core.hooksPath to .githooks.
#
# Why:
# - `.git/hooks/*` is not committed; `.githooks/*` is.
# - Makes pre-commit/pre-push behavior consistent across clones.

set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Skipping git hook install: not inside a git working tree."
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ ! -d .githooks ]]; then
  echo "Missing .githooks/ (expected in repo root)."
  exit 1
fi

chmod +x .githooks/pre-commit .githooks/pre-push
current_hooks_path="$(git config --get core.hooksPath || true)"
if [[ "$current_hooks_path" != ".githooks" ]]; then
  git config core.hooksPath .githooks
fi

echo "✅ Installed git hooks (core.hooksPath=.githooks)"
