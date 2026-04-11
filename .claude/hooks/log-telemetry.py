#!/usr/bin/env python3
"""Universal telemetry hook for the Justice League Factory.

Handles ALL hook event types. Every event is logged to the `events` table.
SubagentStop events additionally populate `agent_runs` and `agent_transcripts`
with full transcript content and extracted token/model data.

Usage: cat event.json | python3 log-telemetry.py /path/to/project
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

# Import cost calculation — gracefully degrade if not available
try:
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dashboard-api"))
    from dashboard_api.cost import calculate_cost
except ImportError:
    def calculate_cost(**kwargs) -> float:
        return 0.0


def get_db_path() -> str:
    """Database lives in the factory repo, not the target project."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "..", "..", "eval", "factory.db")


def get_schema_path() -> str:
    """Schema lives in the factory repo, not the target project."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "..", "..", "eval", "init-db.sql")


def init_db(db_path: str, schema_path: str) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    if os.path.isfile(schema_path):
        with open(schema_path, "r") as f:
            conn.executescript(f.read())
    return conn


def log_event(conn: sqlite3.Connection, event: dict) -> None:
    """Log any hook event to the events table."""
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO events (session_id, event_type, timestamp, agent_type, agent_id, data) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            event.get("session_id"),
            event.get("hook_event_name", "unknown"),
            now,
            event.get("agent_type"),
            event.get("agent_id"),
            json.dumps(event),
        ),
    )
    conn.commit()


def parse_transcript(transcript_path: str) -> dict:
    """Read a transcript JSONL file. Extract full content, tokens, and model."""
    result = {
        "full_transcript": None,
        "prompt_text": None,
        "model": None,
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_tokens": 0,
        "cache_creation_tokens": 0,
    }

    if not transcript_path or not os.path.isfile(transcript_path):
        return result

    try:
        with open(transcript_path, "r") as f:
            content = f.read()
        result["full_transcript"] = content
    except OSError:
        return result

    for line in content.strip().split("\n"):
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        # First user message is the prompt
        if result["prompt_text"] is None and entry.get("role") == "user":
            c = entry.get("content", "")
            if isinstance(c, list):
                result["prompt_text"] = " ".join(
                    p.get("text", "") for p in c if isinstance(p, dict)
                )
            else:
                result["prompt_text"] = str(c)

        # Model from message wrapper or top-level
        if not result["model"]:
            result["model"] = entry.get("model") or (
                entry.get("message", {}) or {}
            ).get("model")

        # Token usage — check both top-level and nested under message
        usage = entry.get("usage") or (entry.get("message", {}) or {}).get("usage")
        if usage:
            result["input_tokens"] += usage.get("input_tokens", 0)
            result["output_tokens"] += usage.get("output_tokens", 0)
            result["cache_read_tokens"] += usage.get("cache_read_input_tokens", 0)
            result["cache_creation_tokens"] += usage.get(
                "cache_creation_input_tokens", 0
            )

    return result


def log_agent_run(conn: sqlite3.Connection, event: dict) -> int | None:
    """Insert a structured agent run from a SubagentStop event."""
    now = datetime.now(timezone.utc).isoformat()
    agent = event.get("agent_type", "unknown")

    transcript = parse_transcript(event.get("agent_transcript_path"))

    cost = calculate_cost(
        model=transcript["model"] or event.get("model"),
        input_tokens=transcript["input_tokens"],
        output_tokens=transcript["output_tokens"],
        cache_read_tokens=transcript["cache_read_tokens"],
        cache_creation_tokens=transcript["cache_creation_tokens"],
    )

    cursor = conn.execute(
        """INSERT INTO agent_runs (
            run_id, agent, model, started_at, completed_at,
            duration_ms, input_tokens, output_tokens,
            cache_read_tokens, cache_creation_tokens,
            verdict, retry_count, artifacts_produced,
            phase, cost_usd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            event.get("session_id"),
            agent,
            transcript["model"] or event.get("model"),
            event.get("started_at", now),
            now,
            event.get("duration_ms"),
            transcript["input_tokens"],
            transcript["output_tokens"],
            transcript["cache_read_tokens"],
            transcript["cache_creation_tokens"],
            event.get("verdict"),
            event.get("retry_count", 0),
            json.dumps(event.get("artifacts_produced"))
            if event.get("artifacts_produced")
            else None,
            event.get("phase"),
            cost,
        ),
    )
    conn.commit()
    return cursor.lastrowid


def log_transcript(
    conn: sqlite3.Connection, agent_run_id: int, event: dict
) -> None:
    """Store the full transcript content in SQLite."""
    transcript = parse_transcript(event.get("agent_transcript_path"))
    response_text = event.get("last_assistant_message")

    if transcript["full_transcript"] or response_text:
        conn.execute(
            """INSERT INTO agent_transcripts (
                agent_run_id, prompt_text, response_text, full_transcript,
                model, total_input_tokens, total_output_tokens,
                total_cache_read_tokens, total_cache_creation_tokens
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                agent_run_id,
                transcript["prompt_text"],
                response_text,
                transcript["full_transcript"],
                transcript["model"],
                transcript["input_tokens"],
                transcript["output_tokens"],
                transcript["cache_read_tokens"],
                transcript["cache_creation_tokens"],
            ),
        )
        conn.commit()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: log-telemetry.py <project_dir>", file=sys.stderr)
        sys.exit(1)

    project_dir = sys.argv[1]

    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)
        event = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Failed to parse event JSON: {e}", file=sys.stderr)
        sys.exit(1)

    db_path = get_db_path()
    schema_path = get_schema_path()

    try:
        conn = init_db(db_path, schema_path)
    except sqlite3.Error as e:
        print(f"Failed to initialize database: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        # Every event goes into the events table
        log_event(conn, event)

        # SubagentStop events also get structured agent run + transcript data
        event_type = event.get("hook_event_name", "")
        if event_type == "SubagentStop":
            agent_run_id = log_agent_run(conn, event)
            if agent_run_id:
                log_transcript(conn, agent_run_id, event)
            agent = event.get("agent_type", "unknown")
            print(f"Logged SubagentStop for {agent}", file=sys.stderr)
        else:
            print(f"Logged {event_type} event", file=sys.stderr)

    except sqlite3.Error as e:
        print(f"Failed to log telemetry: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
