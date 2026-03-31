#!/usr/bin/env python3
"""SubagentStop telemetry logger.

Reads JSON from stdin (SubagentStop event data) and logs agent completion
telemetry to a SQLite database. Initializes the DB schema if needed.

Usage: cat event.json | python3 log-telemetry.py /path/to/project
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone


def get_db_path(project_dir: str) -> str:
    return os.path.join(project_dir, "eval", "factory.db")


def get_schema_path(project_dir: str) -> str:
    return os.path.join(project_dir, "eval", "init-db.sql")


def init_db(db_path: str, schema_path: str) -> sqlite3.Connection:
    """Initialize the database, creating tables if they don't exist."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)

    if os.path.isfile(schema_path):
        with open(schema_path, "r") as f:
            schema_sql = f.read()
        conn.executescript(schema_sql)
    else:
        print(
            f"Warning: Schema file not found at {schema_path}",
            file=sys.stderr,
        )

    return conn


def log_agent_run(conn: sqlite3.Connection, event: dict) -> int | None:
    """Insert an agent run record. Returns the agent_run id."""
    now = datetime.now(timezone.utc).isoformat()

    cursor = conn.execute(
        """
        INSERT INTO agent_runs (
            run_id, agent, model, started_at, completed_at,
            duration_ms, input_tokens, output_tokens, verdict,
            retry_count, artifacts_produced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event.get("run_id"),
            event.get("agent_name", "unknown"),
            event.get("model"),
            event.get("started_at", now),
            event.get("completed_at", now),
            event.get("duration_ms"),
            event.get("input_tokens", 0),
            event.get("output_tokens", 0),
            event.get("verdict"),
            event.get("retry_count", 0),
            json.dumps(event.get("artifacts_produced"))
            if event.get("artifacts_produced")
            else None,
        ),
    )
    conn.commit()
    return cursor.lastrowid


def log_transcript(conn: sqlite3.Connection, agent_run_id: int, event: dict) -> None:
    """Store transcript data if available in the event."""
    transcript = event.get("transcript")
    if not transcript:
        return

    prompt_text = transcript.get("prompt_text")
    response_text = transcript.get("response_text")

    if prompt_text or response_text:
        conn.execute(
            """
            INSERT INTO agent_transcripts (agent_run_id, prompt_text, response_text)
            VALUES (?, ?, ?)
            """,
            (agent_run_id, prompt_text, response_text),
        )
        conn.commit()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: log-telemetry.py <project_dir>", file=sys.stderr)
        sys.exit(1)

    project_dir = sys.argv[1]

    # Read event JSON from stdin
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print("No input received on stdin", file=sys.stderr)
            sys.exit(0)
        event = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Failed to parse event JSON: {e}", file=sys.stderr)
        sys.exit(1)

    db_path = get_db_path(project_dir)
    schema_path = get_schema_path(project_dir)

    try:
        conn = init_db(db_path, schema_path)
    except sqlite3.Error as e:
        print(f"Failed to initialize database: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        agent_run_id = log_agent_run(conn, event)
        if agent_run_id:
            log_transcript(conn, agent_run_id, event)
        agent_name = event.get("agent_name", "unknown")
        print(f"Logged telemetry for agent: {agent_name}", file=sys.stderr)
    except sqlite3.Error as e:
        print(f"Failed to log telemetry: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
