#!/usr/bin/env bash
# PreToolUse hook for Write tool
# Ensures the artifacts/ directory (and briefings/ subdirectory) exists
# before any agent writes to an artifacts/ path.
# Always exits 0 -- never blocks a write.

set -euo pipefail

# Read the hook event JSON from stdin
INPUT=$(cat)

# Extract the file path from tool_input.file_path
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('file_path', ''))" 2>/dev/null || true)

# If we couldn't parse the file path, allow the write
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Detect writes targeting an artifacts/ path
if [[ "$FILE_PATH" == artifacts/* ]] || [[ "$FILE_PATH" == */artifacts/* ]]; then
  # Extract the prefix before "artifacts/" (empty string for relative paths)
  PREFIX="${FILE_PATH%%artifacts/*}"
  mkdir -p "${PREFIX}artifacts/briefings" || true
fi

exit 0
