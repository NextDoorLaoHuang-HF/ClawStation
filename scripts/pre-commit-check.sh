#!/usr/bin/env bash
# Deterministic checks to run before `git commit`.
# Note: frontend changes also run coverage to enforce thresholds early.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR || true)"
if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

echo "🔎 pre-commit checks"
echo "===================="

needs_frontend=0
needs_rust=0

while IFS= read -r f; do
  [[ -z "$f" ]] && continue

  case "$f" in
    src/*|docs/*|scripts/*|README.md|package.json|package-lock.json|eslint.config.js|vite.config.ts|vitest.config.ts|tsconfig*.json)
      needs_frontend=1
      ;;
  esac

  case "$f" in
    src-tauri/*)
      needs_rust=1
      ;;
  esac
done <<< "$STAGED_FILES"

if [[ "$needs_frontend" -eq 1 ]]; then
  echo ""
  echo "Frontend checks"
  echo "--------------"
  npm run type-check
  npm run lint
  npm run layer-lint
  npm run doc-check
  npm run release-gate
  npm run tauri-command-lint
  npm run test:coverage
fi

if [[ "$needs_rust" -eq 1 ]]; then
  ./scripts/toolchain-check.sh

  echo ""
  echo "Rust checks"
  echo "-----------"
  cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
  cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

  # Fast protocol contract smoke tests so RPC field/method regressions are
  # blocked before commit without running the full test suite.
  echo ""
  echo "Rust protocol checks"
  echo "--------------------"
  npm run check:protocol
fi

echo ""
echo "✅ pre-commit checks passed"
