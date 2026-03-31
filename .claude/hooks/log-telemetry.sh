#!/usr/bin/env bash
# SubagentStop hook
# Thin shell wrapper that reads stdin and pipes it to log-telemetry.py.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

cat | python3 "$SCRIPT_DIR/log-telemetry.py" "$PROJECT_DIR"
