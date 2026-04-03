#!/usr/bin/env bash
# Run the Justice League factory headless against a project.
# Usage: ./scripts/run-factory.sh /path/to/project /path/to/feature-request.md
#
# Set FACTORY_TRUST=true to run with --dangerously-skip-permissions
# (no permission prompts, fully autonomous). Only use in trusted environments.
set -euo pipefail

PROJECT_DIR="${1:?Usage: run-factory.sh <project-dir> <feature-request.md>}"
FEATURE_REQUEST="${2:?Usage: run-factory.sh <project-dir> <feature-request.md>}"
FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Justice League Factory ==="
echo "Project: $PROJECT_DIR"
echo "Feature: $FEATURE_REQUEST"
echo "Factory: $FACTORY_DIR"

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
# --output-format stream-json + --verbose enables real-time log streaming.
# Agents are defined in .claude/agents/ with proper frontmatter.
claude -p "You are running the Justice League Factory.

Project directory: $PROJECT_DIR
Factory directory: $FACTORY_DIR

Feature request:
$FEATURE

Execute the full factory workflow. Dispatch agents to plan, implement, review,
test, secure, and document this feature. Write all artifacts to $FACTORY_DIR/artifacts/.

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
echo "Artifacts: $FACTORY_DIR/artifacts/"
echo "Telemetry: $FACTORY_DIR/eval/factory.db"
echo "Log: $FACTORY_DIR/eval/last-run.log"
