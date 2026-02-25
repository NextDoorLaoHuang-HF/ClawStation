#!/usr/bin/env bash
# ClawStation pre-push check
# Run a full, debuggable suite locally to mirror CI expectations.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

echo "🔍 ClawStation pre-push check"
echo "=============================="

# Color only when interactive.
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

FAILED=0

run_check() {
  local label="$1"
  shift
  printf "  %b%s%b\n" "$YELLOW" "$label" "$NC"
  if "$@"; then
    printf "  %b✓%b %s\n" "$GREEN" "$NC" "$label"
  else
    printf "  %b✗%b %s\n" "$RED" "$NC" "$label"
    FAILED=1
  fi
}

echo ""
echo "📦 Frontend"
echo "-----------"
run_check "TypeScript type-check" npm run type-check
run_check "ESLint" npm run lint
run_check "Layer lint" npm run layer-lint
run_check "Doc check" npm run doc-check
run_check "Release gate" npm run release-gate
run_check "Tauri command lint" npm run tauri-command-lint
run_check "Unit tests (coverage)" npm run test:coverage
run_check "Build" npm run build

echo ""
echo "⚙️  Backend (Rust)"
echo "-----------------"
pushd src-tauri >/dev/null
run_check "rustfmt" cargo fmt -- --check
run_check "clippy" cargo clippy --all-targets -- -D warnings
run_check "tests" cargo test
popd >/dev/null

echo ""
echo "=============================="
if [[ "$FAILED" -eq 0 ]]; then
  printf "%b✅ All checks passed — safe to push.%b\n" "$GREEN" "$NC"
  exit 0
fi

printf "%b❌ Checks failed — fix issues and re-run.%b\n" "$RED" "$NC"
echo ""
echo "Common fixes:"
echo "  npm run format     # auto-fix frontend lint issues"
echo "  npm run codex:fix   # have Codex CLI attempt an automated fix"
echo "  cargo fmt          # format Rust code (run in src-tauri/)"
exit 1
