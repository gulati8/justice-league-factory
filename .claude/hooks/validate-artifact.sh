#!/usr/bin/env bash
# PostToolUse hook for Write tool
# Validates artifact JSON files against their schemas.
# Exit 0 = allow, Exit 2 = block the write.
# Only validates files in .factory-run/ that match known artifact names.

set -euo pipefail

# Read the hook event JSON from stdin
INPUT=$(cat)

# Extract the file path from tool_input.file_path
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('file_path', ''))" 2>/dev/null || true)

# If we couldn't parse the file path, allow the write
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Map known artifact paths to their schema files.
# Only validate files inside the .factory-run/ directory.
case "$FILE_PATH" in
  */.factory-run/plan.json)            SCHEMA="plan.schema.json" ;;
  */.factory-run/review.json)          SCHEMA="review.schema.json" ;;
  */.factory-run/test-results.json)    SCHEMA="test-results.schema.json" ;;
  */.factory-run/security-review.json) SCHEMA="security-review.schema.json" ;;
  */.factory-run/improvements.json)    SCHEMA="improvement.schema.json" ;;
  *)
    # Not a known artifact — allow the write
    exit 0
    ;;
esac

# Resolve the project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SCHEMA_PATH="$PROJECT_DIR/.claude/schemas/$SCHEMA"

# If the schema file doesn't exist, allow the write (graceful degradation)
if [ ! -f "$SCHEMA_PATH" ]; then
  echo "Warning: Schema not found at $SCHEMA_PATH — skipping validation" >&2
  exit 0
fi

# Validate the artifact against its schema using Python
python3 - "$FILE_PATH" "$SCHEMA_PATH" "$SCHEMA" <<'PYEOF'
import sys

# Gracefully degrade if jsonschema isn't installed
try:
    import jsonschema
except ImportError:
    print("Warning: jsonschema not installed — skipping validation", file=sys.stderr)
    sys.exit(0)

import json

file_path = sys.argv[1]
schema_path = sys.argv[2]
schema_name = sys.argv[3]

# Read the written file to validate its content
try:
    with open(file_path, "r") as f:
        artifact = json.load(f)
except (json.JSONDecodeError, FileNotFoundError) as e:
    print(f"Artifact validation failed: {e}", file=sys.stderr)
    sys.exit(2)

# Load the schema
try:
    with open(schema_path, "r") as f:
        schema = json.load(f)
except (json.JSONDecodeError, FileNotFoundError) as e:
    print(f"Warning: Could not load schema: {e}", file=sys.stderr)
    sys.exit(0)

# Validate
try:
    jsonschema.validate(instance=artifact, schema=schema)
    print(f"Artifact validated against {schema_name}", file=sys.stderr)
    sys.exit(0)
except jsonschema.ValidationError as e:
    print(f"Artifact validation failed against {schema_name}: {e.message}", file=sys.stderr)
    sys.exit(2)
PYEOF
