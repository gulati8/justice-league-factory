#!/usr/bin/env bash
# PreToolUse hook for Write tool
# Ensures the .factory-run/ directory (and briefings/ subdirectory) exists
# before any agent writes to a .factory-run/ path.
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

# Detect writes targeting a .factory-run/ path
if [[ "$FILE_PATH" == .factory-run/* ]] || [[ "$FILE_PATH" == */.factory-run/* ]]; then
  # Extract the prefix before ".factory-run/" (empty string for relative paths)
  PREFIX="${FILE_PATH%%.factory-run/*}"
  mkdir -p "${PREFIX}.factory-run/briefings" || true
fi

exit 0
