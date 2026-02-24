#!/usr/bin/env bash
# Local "agent-friendly" review gate. Keep output deterministic and actionable.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$REPO_ROOT"

echo "🧾 Self review"
echo "=============="
echo "Running: npm run check"
echo ""

npm run check

echo ""
echo "Next (optional):"
echo "  git status"
echo "  git diff"

