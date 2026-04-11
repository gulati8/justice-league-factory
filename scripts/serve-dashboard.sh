#!/usr/bin/env bash
# Serve the Justice League Factory dashboard.
# Usage: ./scripts/serve-dashboard.sh [port]
#
# Starts the FastAPI backend and (if node_modules exist) the Vite dev server.
# If node_modules don't exist, serves the legacy static dashboard as fallback.
set -euo pipefail

FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${1:-8080}"
DB="$FACTORY_DIR/eval/factory.db"

# Initialize DB if needed
sqlite3 "$DB" < "$FACTORY_DIR/eval/init-db.sql" 2>/dev/null || true

echo "=== Justice League Factory — Mission Control ==="
echo "Database: $DB"

# Start FastAPI backend
if [ -f "$FACTORY_DIR/dashboard-api/dashboard_api/main.py" ]; then
  echo "Starting API server on port $API_PORT..."
  FACTORY_DB="$DB" PYTHONPATH="$FACTORY_DIR/dashboard-api" \
    python3 -m uvicorn dashboard_api.main:create_app --factory --host 0.0.0.0 --port "$API_PORT" &
  API_PID=$!
  echo "API: http://localhost:$API_PORT"
else
  echo "WARNING: dashboard-api not found, falling back to legacy dashboard"
  python3 -c "
import http.server, os
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory='$FACTORY_DIR/dashboard', **k)
print('Legacy dashboard: http://localhost:$API_PORT')
http.server.HTTPServer(('', $API_PORT), H).serve_forever()
" &
  API_PID=$!
fi

# Start Vite dev server if node_modules exist
if [ -d "$FACTORY_DIR/dashboard-app/node_modules" ]; then
  echo "Starting Vite dev server on port 5173..."
  cd "$FACTORY_DIR/dashboard-app" && npm run dev &
  VITE_PID=$!
  echo "Dashboard: http://localhost:5173"
else
  echo "NOTE: Run 'cd dashboard-app && npm install' to use the new React dashboard"
  echo "Falling back to legacy dashboard at http://localhost:$API_PORT"
  VITE_PID=""
fi

# Trap cleanup
cleanup() {
  kill "$API_PID" 2>/dev/null || true
  [ -n "${VITE_PID:-}" ] && kill "$VITE_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "Press Ctrl+C to stop"
wait
