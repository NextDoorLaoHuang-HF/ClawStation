#!/usr/bin/env bash
# Generate frontend (and optional backend) coverage artifacts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

echo "📊 Coverage"
echo "==========="

mkdir -p coverage

echo ""
echo "Frontend (Vitest)"
npm run test:coverage

if [[ -f coverage/lcov.info ]]; then
  echo "✓ Frontend lcov: coverage/lcov.info"
fi
if [[ -f coverage/index.html ]]; then
  echo "✓ Frontend HTML: coverage/index.html"
fi

echo ""
echo "Backend (Rust, optional)"
if command -v cargo-tarpaulin >/dev/null 2>&1 || cargo tarpaulin --version >/dev/null 2>&1; then
  pushd src-tauri >/dev/null
  cargo tarpaulin --out Lcov --output-dir ../coverage
  popd >/dev/null
  [[ -f coverage/lcov.info ]] && echo "✓ Backend lcov: coverage/lcov.info"
else
  echo "Skipping: cargo-tarpaulin not installed (install separately if needed)."
fi

