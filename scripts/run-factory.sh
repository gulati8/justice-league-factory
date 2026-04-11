#!/usr/bin/env bash
# Run the Justice League factory headless against a project.
# Usage: ./scripts/run-factory.sh /path/to/project /path/to/feature-request.md [--gates "spec=auto plan=auto ship=auto"]
#
# Set FACTORY_TRUST=true to run with --dangerously-skip-permissions
# (no permission prompts, fully autonomous). Only use in trusted environments.
set -euo pipefail

PROJECT_DIR="${1:?Usage: run-factory.sh <project-dir> <feature-request.md> [--gates \"spec=auto plan=auto ship=auto\"]}"
FEATURE_REQUEST="${2:?Usage: run-factory.sh <project-dir> <feature-request.md> [--gates \"spec=auto plan=auto ship=auto\"]}"
FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Parse optional --gates flag
GATES_INSTRUCTION=""
shift 2
while [[ $# -gt 0 ]]; do
  case "$1" in
    --gates)
      GATES_INSTRUCTION="Autonomy gates for this run: $2. Do not ask the user — use these settings."
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

echo "=== Justice League Factory ==="
echo "Project: $PROJECT_DIR"
echo "Feature: $FEATURE_REQUEST"
echo "Factory: $FACTORY_DIR"
if [ -n "$GATES_INSTRUCTION" ]; then
  echo "Gates:   specified via --gates"
fi

FEATURE=$(cat "$FEATURE_REQUEST")

# Initialize telemetry DB
sqlite3 "$FACTORY_DIR/eval/factory.db" < "$FACTORY_DIR/eval/init-db.sql" 2>/dev/null || true

# Trust mode: skip all permission prompts
TRUST_FLAG=""
if [ "${FACTORY_TRUST:-false}" = "true" ]; then
  TRUST_FLAG="--dangerously-skip-permissions"
  echo "Mode: TRUSTED (no permission prompts)"
else
  echo "Mode: STANDARD (set FACTORY_TRUST=true for autonomous)"
fi

echo "Log: tail -f $FACTORY_DIR/eval/last-run.log"
echo ""

# Run Batman headless with streaming output.
claude -p "You are running the Justice League Factory.

Project directory: $PROJECT_DIR
Factory directory: $FACTORY_DIR

$GATES_INSTRUCTION

Feature request:
$FEATURE

Execute the full factory workflow. Dispatch agents to plan, implement, review,
test, secure, and document this feature. Write all artifacts to $FACTORY_DIR/.factory-run/.

When dispatching agents, use their names (e.g., martian-manhunter, cyborg, wonder-woman).
Each agent's tools and skills are configured in their agent definitions." \
  --agent batman \
  --allowedTools "Read,Write,Agent,Bash,Glob,Grep,Edit" \
  --output-format stream-json \
  --verbose \
  $TRUST_FLAG \
  >> "$FACTORY_DIR/eval/last-run.log" 2>&1

echo ""
echo "=== Factory run complete ==="
echo "Artifacts: $FACTORY_DIR/.factory-run/"
echo "Telemetry: $FACTORY_DIR/eval/factory.db"
echo "Log: $FACTORY_DIR/eval/last-run.log"
