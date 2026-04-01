#!/usr/bin/env bash
# Serve the dashboard with API endpoints for SQLite telemetry.
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
import re
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
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == '/api/events':
            self.serve_events(params)
        elif path == '/api/events/count':
            self.serve_events_count(params)
        elif path == '/api/runs':
            self.serve_runs()
        elif path == '/api/agents':
            self.serve_agents(params)
        elif path == '/api/latest':
            self.serve_latest()
        elif re.match(r'^/api/transcript/(\d+)$', path):
            agent_run_id = int(re.match(r'^/api/transcript/(\d+)$', path).group(1))
            self.serve_transcript(agent_run_id)
        else:
            super().do_GET()

    def serve_events(self, params):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        since = int(params.get('since', ['0'])[0])
        limit = int(params.get('limit', ['200'])[0])
        offset = int(params.get('offset', ['0'])[0])
        from_ts = params.get('from', [None])[0]
        to_ts = params.get('to', [None])[0]

        # Build WHERE clause — since= and datetime filters compose together
        conditions = ['id > ?']
        args = [since]

        if from_ts:
            conditions.append('timestamp >= ?')
            args.append(from_ts)
        if to_ts:
            conditions.append('timestamp <= ?')
            args.append(to_ts)

        where = ' AND '.join(conditions)
        args += [limit, offset]

        rows = conn.execute(
            'SELECT * FROM events WHERE ' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?',
            args
        ).fetchall()
        conn.close()
        self.json_response([dict(r) for r in rows])

    def serve_events_count(self, params):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

        from_ts = params.get('from', [None])[0]
        to_ts = params.get('to', [None])[0]

        conditions = []
        args = []

        if from_ts:
            conditions.append('timestamp >= ?')
            args.append(from_ts)
        if to_ts:
            conditions.append('timestamp <= ?')
            args.append(to_ts)

        where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

        row = conn.execute(
            'SELECT COUNT(*) as count FROM events ' + where,
            args
        ).fetchone()
        conn.close()
        self.json_response({'count': row['count'] if row else 0})

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

    def serve_transcript(self, agent_run_id):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            'SELECT * FROM agent_transcripts WHERE agent_run_id = ?',
            (agent_run_id,)
        ).fetchone()
        conn.close()
        if row:
            self.json_response(dict(row))
        else:
            self.send_response(404)
            self.end_headers()

    def json_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def log_message(self, format, *args):
        pass

print('Dashboard: http://localhost:$PORT')
http.server.HTTPServer(('', $PORT), DashboardHandler).serve_forever()
"
