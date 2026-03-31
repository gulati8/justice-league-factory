#!/usr/bin/env bash
# Serve the dashboard with a simple API backend for SQLite queries.
# Usage: ./scripts/serve-dashboard.sh [port]
set -euo pipefail

FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-8080}"
DB="$FACTORY_DIR/eval/factory.db"

# Initialize DB if needed
sqlite3 "$DB" < "$FACTORY_DIR/eval/init-db.sql" 2>/dev/null || true

echo "=== Justice League Factory — Mission Control ==="
echo "Dashboard: http://localhost:$PORT"
echo "Database:  $DB"
echo ""

python3 -c "
import http.server
import json
import sqlite3
import os
from urllib.parse import urlparse, parse_qs

DB_PATH = '$DB'
DASHBOARD_DIR = '$FACTORY_DIR/dashboard'

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DASHBOARD_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/runs':
            self.serve_runs()
        elif parsed.path == '/api/agents':
            self.serve_agents(parse_qs(parsed.query))
        elif parsed.path == '/api/latest':
            self.serve_latest()
        else:
            super().do_GET()

    def serve_runs(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            'SELECT * FROM factory_runs ORDER BY started_at DESC LIMIT 20'
        ).fetchall()
        conn.close()
        self.json_response([dict(r) for r in rows])

    def serve_agents(self, params):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        run_id = params.get('run_id', [None])[0]
        if run_id:
            rows = conn.execute(
                'SELECT * FROM agent_runs WHERE run_id = ? ORDER BY started_at',
                (run_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                'SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 50'
            ).fetchall()
        conn.close()
        self.json_response([dict(r) for r in rows])

    def serve_latest(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            'SELECT * FROM agent_runs ORDER BY id DESC LIMIT 20'
        ).fetchall()
        conn.close()
        self.json_response([dict(r) for r in rows])

    def json_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def log_message(self, format, *args):
        pass  # Suppress request logging noise

print('Dashboard: http://localhost:$PORT')
http.server.HTTPServer(('', $PORT), DashboardHandler).serve_forever()
"
