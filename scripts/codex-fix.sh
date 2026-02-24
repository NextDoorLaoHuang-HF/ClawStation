#!/usr/bin/env bash
# Run checks, and if they fail, ask Codex CLI to fix the repo, then re-run checks.
#
# Usage:
#   ./scripts/codex-fix.sh all|frontend|backend|pre-commit
#   ./scripts/codex-fix.sh -- <arbitrary command...>

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

mode="${1:-all}"
shift || true

if [[ "$mode" == "--" ]]; then
  mode="custom"
fi

mkdir -p .codex/fix
ts="$(date -u +'%Y%m%dT%H%M%SZ')"
log=".codex/fix/${ts}-${mode}.log"

declare -a check_cmd
case "$mode" in
  frontend)
    check_cmd=(npm run check:frontend)
    ;;
  backend)
    check_cmd=(npm run check:backend)
    ;;
  pre-commit)
    check_cmd=(./scripts/pre-commit-check.sh)
    ;;
  all)
    check_cmd=(npm run check)
    ;;
  custom)
    check_cmd=("$@")
    ;;
  *)
    echo "Unknown mode: $mode"
    echo "Usage: $0 all|frontend|backend|pre-commit|-- <command...>"
    exit 2
    ;;
esac

run_check() {
  set +e
  ("${check_cmd[@]}") 2>&1 | tee "$log"
  status="${PIPESTATUS[0]}"
  set -e
  return "$status"
}

echo "🧪 Running checks: ${check_cmd[*]}"
echo "Log: $log"
echo ""

if run_check; then
  echo ""
  echo "✅ Already passing."
  exit 0
fi

echo ""
echo "❌ Checks failed. Launching Codex CLI to fix…"
echo ""

prompt_file=".codex/fix/${ts}-${mode}.prompt.md"
cat > "$prompt_file" <<EOF
# Task

Fix the repository so that the following command succeeds (exit 0):

\`\`\`bash
${check_cmd[*]}
\`\`\`

# Failure Output

The full failing output is saved at:

- \`${log}\`

Read it from disk (do not ask the user to paste it).

# Requirements

- Make the minimal set of changes needed.
- Prefer editing existing code/tests/docs over adding new dependencies.
- If a test is flaky, record it in \`FLAKY_TESTS.md\` with a short workaround and a tracking issue placeholder.
- After changes, re-run the command and ensure it passes.
EOF

# Read prompt from stdin by passing "-" as PROMPT.
codex exec -s workspace-write - < "$prompt_file"

echo ""
echo "🔁 Re-running checks…"
echo ""
run_check

