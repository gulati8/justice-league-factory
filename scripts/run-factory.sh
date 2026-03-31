#!/usr/bin/env bash
# Run the Justice League factory headless against a project.
# Usage: ./scripts/run-factory.sh /path/to/project /path/to/feature-request.md
set -euo pipefail

PROJECT_DIR="${1:?Usage: run-factory.sh <project-dir> <feature-request.md>}"
FEATURE_REQUEST="${2:?Usage: run-factory.sh <project-dir> <feature-request.md>}"
FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Justice League Factory ==="
echo "Project: $PROJECT_DIR"
echo "Feature: $FEATURE_REQUEST"
echo "Factory: $FACTORY_DIR"
echo ""

FEATURE=$(cat "$FEATURE_REQUEST")

# Ensure artifacts directory is ready
mkdir -p "$FACTORY_DIR/artifacts/briefings"

# Initialize telemetry DB
sqlite3 "$FACTORY_DIR/eval/factory.db" < "$FACTORY_DIR/eval/init-db.sql" 2>/dev/null || true

# Run Batman headless — he orchestrates everything via agent dispatch.
# Agents are defined in .claude/agents/ with proper frontmatter (tools, model, skills).
# Batman dispatches them by name; each gets its own isolated context.
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
  2>&1 | tee "$FACTORY_DIR/eval/last-run.log"

echo ""
echo "=== Factory run complete ==="
echo "Artifacts: $FACTORY_DIR/artifacts/"
echo "Telemetry: $FACTORY_DIR/eval/factory.db"
echo "Log: $FACTORY_DIR/eval/last-run.log"
