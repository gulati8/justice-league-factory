#!/usr/bin/env bash
# Run Oracle (Learner) against the eval history
# Usage: ./scripts/run-oracle.sh
set -euo pipefail

FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Oracle — Analyzing factory performance ==="

ORACLE_PROMPT=$(cat "$FACTORY_DIR/agents/oracle.md")

PROMPT="$ORACLE_PROMPT

## Mission

Analyze the eval history at $FACTORY_DIR/eval/eval-log.jsonl and the current agent definitions at $FACTORY_DIR/agents/. Propose improvements following your workflow. If you find safe improvements, create a branch, apply them, and open a PR.

Factory repo: $FACTORY_DIR"

claude -p "$PROMPT" \
  --allowedTools "Read,Write,Bash,Glob,Grep" \
  2>&1 | tee "$FACTORY_DIR/eval/oracle-run.log"

echo ""
echo "=== Oracle analysis complete ==="
