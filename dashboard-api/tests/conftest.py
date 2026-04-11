"""Shared test fixtures for dashboard API tests."""

import os
import sqlite3
import tempfile

import pytest


@pytest.fixture
def db_path():
    """Create a temporary SQLite database with the factory schema and seed data."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")

    schema_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "eval", "init-db.sql"
    )
    with open(schema_path) as f:
        sql = f.read()
        for statement in sql.split(";"):
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(statement)
                except Exception:
                    pass
    conn.commit()

    conn.execute(
        """INSERT INTO factory_runs (run_id, feature, started_at, completed_at,
           overall_verdict, total_duration_ms, total_input_tokens, total_output_tokens,
           total_cost_usd, gate_config)
           VALUES ('run_abc12345', 'Add user sharing', '2026-04-10T14:00:00Z',
           '2026-04-10T14:14:00Z', 'pass', 840000, 50000, 15000, 0.82,
           '{"spec":"auto","plan":"review","ship":"auto"}')"""
    )
    conn.execute(
        """INSERT INTO factory_runs (run_id, feature, started_at, completed_at,
           overall_verdict, total_duration_ms, total_input_tokens, total_output_tokens,
           total_cost_usd, gate_config)
           VALUES ('run_def67890', 'Fix login bug', '2026-04-10T15:00:00Z',
           '2026-04-10T15:08:00Z', 'fail', 480000, 30000, 8000, 1.24,
           '{"spec":"skip","plan":"auto","ship":"review"}')"""
    )

    for agent, phase, tokens_in, tokens_out, cost, verdict in [
        ("brainiac", "research", 12000, 3000, 0.14, None),
        ("martian-manhunter", "plan_v1", 15000, 4000, 0.18, None),
        ("martian-manhunter", "devils_advocate", 9000, 2000, 0.11, None),
        ("cyborg", "implementation", 18000, 5000, 0.22, None),
        ("wonder-woman", "quality_gate", 8000, 1000, 0.09, "pass"),
        ("flash", "quality_gate", 5000, 1500, 0.06, "pass"),
        ("green-lantern", "quality_gate", 4000, 800, 0.04, "pass"),
        ("lois-lane", "documentation", 3000, 700, 0.03, None),
    ]:
        conn.execute(
            """INSERT INTO agent_runs (run_id, agent, model, started_at, completed_at,
               duration_ms, input_tokens, output_tokens, verdict, phase, cost_usd)
               VALUES (?, ?, 'claude-opus-4-6', '2026-04-10T14:00:00Z',
               '2026-04-10T14:03:00Z', 180000, ?, ?, ?, ?, ?)""",
            ("run_abc12345", agent, tokens_in, tokens_out, verdict, phase, cost),
        )

    conn.execute(
        """INSERT INTO gate_events (run_id, gate_name, action, comment,
           wait_duration_ms, timestamp)
           VALUES ('run_abc12345', 'plan', 'approved',
           'add rate limiting to share endpoint', 240000,
           '2026-04-10T14:06:00Z')"""
    )

    conn.commit()
    conn.close()

    yield path
    os.unlink(path)
