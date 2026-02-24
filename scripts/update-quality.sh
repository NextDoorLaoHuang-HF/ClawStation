#!/usr/bin/env bash
# Update lightweight quality signals in docs (auto-generated).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

STAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

echo "Running coverage to capture a summary..."
COVERAGE_OUTPUT="$(npm run -s test:coverage 2>&1 || true)"
ALL_FILES_LINE="$(
  printf '%s\n' "$COVERAGE_OUTPUT" \
    | grep -E '^[[:space:]]*All files' \
    | head -n 1 \
    | sed -E 's/^[[:space:]]+//'
)"

mkdir -p docs
cat > docs/QUALITY_STATUS.md <<EOF
# Quality Status (Auto-generated)

- Generated: ${STAMP} (UTC)
- Commit: ${COMMIT_SHA}

## Frontend Coverage (Vitest)

\`\`\`
${ALL_FILES_LINE:-"(coverage summary not found)"}
\`\`\`
EOF

echo "✅ Updated: docs/QUALITY_STATUS.md"
