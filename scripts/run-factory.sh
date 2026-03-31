#!/usr/bin/env bash
# Run the Justice League factory against a project
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

# Read Batman's identity
BATMAN_PROMPT=$(cat "$FACTORY_DIR/agents/batman.md")

# Read the feature request
FEATURE=$(cat "$FEATURE_REQUEST")

# Ensure artifacts directory exists and is clean
mkdir -p "$FACTORY_DIR/artifacts/briefings"

# Construct the full prompt
PROMPT="$BATMAN_PROMPT

## Mission

You are running the Justice League Factory against the project at: $PROJECT_DIR

The factory repo with agent definitions and schemas is at: $FACTORY_DIR

Feature request:
$FEATURE

Execute the full factory workflow. Dispatch each agent as described in your workflow. Write all artifacts to $FACTORY_DIR/artifacts/.

IMPORTANT: When dispatching subagents, read their full identity from $FACTORY_DIR/agents/<name>.md and include it in the Agent prompt. State their tool restrictions explicitly."

# Run headless
claude -p "$PROMPT" \
  --allowedTools "Read,Write,Agent,Bash,Glob,Grep" \
  2>&1 | tee "$FACTORY_DIR/eval/last-run.log"

echo ""
echo "=== Factory run complete ==="
echo "Artifacts: $FACTORY_DIR/artifacts/"
echo "Log: $FACTORY_DIR/eval/last-run.log"
