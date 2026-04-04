#!/usr/bin/env bash
# Run Oracle to analyze factory performance and propose improvements.
# Usage: ./scripts/run-oracle.sh
set -euo pipefail

FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Oracle — Analyzing factory performance ==="

claude -p "You are running as Oracle, the Justice League Factory's learner agent.

Factory directory: $FACTORY_DIR
Telemetry database: $FACTORY_DIR/eval/factory.db
Agent definitions: $FACTORY_DIR/.claude/agents/
Skills: $FACTORY_DIR/.claude/skills/

Analyze the factory's telemetry, identify patterns, propose improvements,
and open a PR with safe changes." \
  --agent oracle \
  --allowedTools "Read,Write,Bash,Glob,Grep" \
  2>&1 | tee "$FACTORY_DIR/eval/oracle-run.log"

echo ""
echo "=== Oracle analysis complete ==="
echo "Improvements: $FACTORY_DIR/.factory-run/improvements.json"
