#!/usr/bin/env bash
# Fast, deterministic checks to run before `git commit`.
# Keep it quick: full test/build runs are handled by `npm run check` (pre-push/CI).

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
fi

if [[ "$needs_rust" -eq 1 ]]; then
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
  cargo test --manifest-path src-tauri/Cargo.toml gateway::tests::
  cargo test --manifest-path src-tauri/Cargo.toml sessions::tests::
fi

echo ""
echo "✅ pre-commit checks passed"
