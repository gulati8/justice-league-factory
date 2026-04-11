# Enterprise Factory — Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full observability dashboard for the Justice League Factory — run summaries, agent trace views, trend analytics, log viewer, and transcript drilldowns — backed by a FastAPI API over the existing SQLite telemetry database.

**Architecture:** Three layers built bottom-up: (1) extend the SQLite schema and telemetry hooks with trace IDs, cost tracking, gate events, and phase metadata; (2) build a FastAPI backend exposing REST endpoints + SSE for real-time updates; (3) build a React SPA with 5 views inheriting the existing dark theme. The existing `dashboard/` directory stays as fallback; the new app lives in `dashboard-app/`.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, SQLite (WAL mode), React 18, Vite, TypeScript, Recharts, CSS custom properties (porting existing Space Mono dark theme)

**Spec:** `docs/superpowers/specs/2026-04-10-enterprise-factory-roadmap-design.md` — Layer 3

---

## File Structure

### Telemetry (modify existing)

| File | Responsibility |
|------|---------------|
| `eval/init-db.sql` | Extended schema: new columns on agent_runs, gate_events table |
| `.claude/hooks/log-telemetry.py` | Extended hook: cost calculation, phase tracking, gate event logging |

### Backend (new: `dashboard-api/`)

| File | Responsibility |
|------|---------------|
| `dashboard-api/requirements.txt` | Python dependencies (fastapi, uvicorn, sse-starlette) |
| `dashboard-api/main.py` | FastAPI app entry point, CORS, lifespan, mount routes |
| `dashboard-api/db.py` | SQLite connection management, query helpers |
| `dashboard-api/cost.py` | Model pricing lookup, cost calculation per agent run and factory run |
| `dashboard-api/routes/runs.py` | /api/runs endpoints (list, detail, stats) |
| `dashboard-api/routes/agents.py` | /api/agents endpoints (list by run, detail, transcript) |
| `dashboard-api/routes/events.py` | /api/events endpoints (existing log viewer compat + new gate events) |
| `dashboard-api/routes/analytics.py` | /api/analytics endpoints (trends, aggregations) |
| `dashboard-api/routes/sse.py` | SSE endpoint for real-time dashboard updates |
| `dashboard-api/tests/test_runs.py` | Tests for run endpoints |
| `dashboard-api/tests/test_agents.py` | Tests for agent endpoints |
| `dashboard-api/tests/test_analytics.py` | Tests for analytics endpoints |
| `dashboard-api/tests/test_cost.py` | Tests for cost calculation |
| `dashboard-api/tests/conftest.py` | Shared fixtures (test DB with seed data) |

### Frontend (new: `dashboard-app/`)

| File | Responsibility |
|------|---------------|
| `dashboard-app/package.json` | Dependencies, scripts |
| `dashboard-app/vite.config.ts` | Vite config with API proxy |
| `dashboard-app/tsconfig.json` | TypeScript config |
| `dashboard-app/index.html` | HTML entry point |
| `dashboard-app/src/main.tsx` | React entry, router setup |
| `dashboard-app/src/theme.css` | Design tokens ported from existing dashboard/style.css |
| `dashboard-app/src/api/client.ts` | API client (fetch wrapper, types) |
| `dashboard-app/src/api/types.ts` | TypeScript types matching API responses |
| `dashboard-app/src/api/sse.ts` | SSE client for real-time updates |
| `dashboard-app/src/components/Layout.tsx` | App shell: header, nav tabs, agent bar |
| `dashboard-app/src/components/StatsBar.tsx` | Stats bar (runs today, shipped, failed, cost) |
| `dashboard-app/src/components/RunCard.tsx` | Individual run card for summary view |
| `dashboard-app/src/components/TraceTimeline.tsx` | Vertical timeline for run trace view |
| `dashboard-app/src/components/TraceNode.tsx` | Single node in the trace timeline |
| `dashboard-app/src/components/GateNode.tsx` | Human gate node in trace timeline |
| `dashboard-app/src/components/QualityGates.tsx` | Side-by-side quality gate cards |
| `dashboard-app/src/components/TranscriptPanel.tsx` | Transcript overlay/panel |
| `dashboard-app/src/components/LogViewer.tsx` | Ported log viewer from existing dashboard |
| `dashboard-app/src/components/Chart.tsx` | Recharts wrapper for trend charts |
| `dashboard-app/src/views/RunSummary.tsx` | View 1: home page with stats + run cards |
| `dashboard-app/src/views/RunTrace.tsx` | View 2: trace drill-down for a single run |
| `dashboard-app/src/views/Analytics.tsx` | View 3: trend charts and aggregations |
| `dashboard-app/src/views/LogView.tsx` | View 4: preserved log viewer |
| `dashboard-app/src/views/TranscriptView.tsx` | View 5: full transcript for an agent run |

### Scripts (modify existing)

| File | Responsibility |
|------|---------------|
| `scripts/serve-dashboard.sh` | Updated to start FastAPI backend + Vite dev server (or serve built frontend) |

---

### Task 1: Extend SQLite schema

Add new columns and tables to support trace IDs, cost tracking, gate events, and phase metadata.

**Files:**
- Modify: `eval/init-db.sql`

- [ ] **Step 1: Add new columns to agent_runs table**

Add these lines after the existing `artifacts_produced TEXT,` line in `eval/init-db.sql`, inside the `CREATE TABLE IF NOT EXISTS agent_runs` statement:

```sql
-- Add new columns to agent_runs for Phase 3 observability
-- NOTE: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN.
-- These columns are added to the CREATE TABLE statement for new databases.
-- For existing databases, run the ALTER TABLE statements in the migration block below.
```

Replace the full `CREATE TABLE IF NOT EXISTS agent_runs` block with:

```sql
CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  agent TEXT NOT NULL,
  model TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_creation_tokens INTEGER DEFAULT 0,
  verdict TEXT,
  retry_count INTEGER DEFAULT 0,
  artifacts_produced TEXT,
  -- Phase 3 additions
  phase TEXT,
  gate_status TEXT,
  artifacts_consumed TEXT,
  cost_usd REAL DEFAULT 0.0,
  FOREIGN KEY (run_id) REFERENCES factory_runs(run_id)
);
```

- [ ] **Step 2: Add gate_events table**

Add after the `factory_runs` table:

```sql
-- Gate events for autonomy tracking
CREATE TABLE IF NOT EXISTS gate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  gate_name TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  wait_duration_ms INTEGER,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES factory_runs(run_id)
);
```

- [ ] **Step 3: Add total_cost_usd to factory_runs**

Replace the `CREATE TABLE IF NOT EXISTS factory_runs` block with:

```sql
CREATE TABLE IF NOT EXISTS factory_runs (
  run_id TEXT PRIMARY KEY,
  feature TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  overall_verdict TEXT,
  total_duration_ms INTEGER,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0.0,
  gate_config TEXT
);
```

- [ ] **Step 4: Add migration block for existing databases**

Add at the end of `init-db.sql`:

```sql
-- Migrations for existing databases (idempotent)
-- SQLite silently ignores duplicate column additions when wrapped in try/catch,
-- but we use a pragma-based approach: attempt the ALTER and ignore errors.

-- agent_runs new columns
ALTER TABLE agent_runs ADD COLUMN phase TEXT;
ALTER TABLE agent_runs ADD COLUMN gate_status TEXT;
ALTER TABLE agent_runs ADD COLUMN artifacts_consumed TEXT;
ALTER TABLE agent_runs ADD COLUMN cost_usd REAL DEFAULT 0.0;

-- factory_runs new columns
ALTER TABLE factory_runs ADD COLUMN total_cost_usd REAL DEFAULT 0.0;
ALTER TABLE factory_runs ADD COLUMN gate_config TEXT;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_phase ON agent_runs(phase);
CREATE INDEX IF NOT EXISTS idx_gate_events_run_id ON gate_events(run_id);
CREATE INDEX IF NOT EXISTS idx_gate_events_gate ON gate_events(gate_name);
```

- [ ] **Step 5: Commit**

```bash
git add eval/init-db.sql
git commit -m "feat: extend SQLite schema for observability

Add phase, gate_status, artifacts_consumed, cost_usd to agent_runs.
Add total_cost_usd, gate_config to factory_runs.
Add gate_events table for autonomy tracking.
Includes idempotent migration block for existing databases."
```

---

### Task 2: Add cost calculation module

Create the cost calculation module used by both the telemetry hook and the API.

**Files:**
- Create: `dashboard-api/cost.py`
- Create: `dashboard-api/tests/test_cost.py`
- Create: `dashboard-api/tests/__init__.py`
- Create: `dashboard-api/__init__.py`
- Create: `dashboard-api/tests/conftest.py`

- [ ] **Step 1: Write the failing test**

Create `dashboard-api/tests/__init__.py` (empty) and `dashboard-api/__init__.py` (empty).

Create `dashboard-api/tests/test_cost.py`:

```python
from dashboard_api.cost import calculate_cost, MODEL_PRICING


def test_calculate_cost_opus():
    cost = calculate_cost(
        model="claude-opus-4-6",
        input_tokens=1000,
        output_tokens=500,
        cache_read_tokens=200,
        cache_creation_tokens=100,
    )
    pricing = MODEL_PRICING["claude-opus-4-6"]
    expected = (
        1000 * pricing["input"]
        + 500 * pricing["output"]
        + 200 * pricing["cache_read"]
        + 100 * pricing["cache_creation"]
    )
    assert abs(cost - expected) < 0.0001


def test_calculate_cost_sonnet():
    cost = calculate_cost(
        model="claude-sonnet-4-6",
        input_tokens=10000,
        output_tokens=2000,
    )
    pricing = MODEL_PRICING["claude-sonnet-4-6"]
    expected = 10000 * pricing["input"] + 2000 * pricing["output"]
    assert abs(cost - expected) < 0.0001


def test_calculate_cost_unknown_model_uses_sonnet_pricing():
    cost = calculate_cost(
        model="unknown-model",
        input_tokens=1000,
        output_tokens=500,
    )
    pricing = MODEL_PRICING["claude-sonnet-4-6"]
    expected = 1000 * pricing["input"] + 500 * pricing["output"]
    assert abs(cost - expected) < 0.0001


def test_calculate_cost_zero_tokens():
    cost = calculate_cost(model="claude-opus-4-6", input_tokens=0, output_tokens=0)
    assert cost == 0.0


def test_calculate_cost_partial_model_match():
    """Models like 'claude-opus-4-6-20250101' should match 'claude-opus-4-6'."""
    cost = calculate_cost(
        model="claude-opus-4-6-20250101",
        input_tokens=1000,
        output_tokens=500,
    )
    pricing = MODEL_PRICING["claude-opus-4-6"]
    expected = 1000 * pricing["input"] + 500 * pricing["output"]
    assert abs(cost - expected) < 0.0001
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && python -m pytest dashboard-api/tests/test_cost.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'dashboard_api'`

- [ ] **Step 3: Write the implementation**

Create `dashboard-api/cost.py`:

```python
"""Cost calculation for factory agent runs.

Pricing is per-token in USD. Updated as of 2026-04-01.
Models are matched by prefix to handle versioned model IDs
(e.g., 'claude-opus-4-6-20250101' matches 'claude-opus-4-6').
"""

MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-6": {
        "input": 15.0 / 1_000_000,
        "output": 75.0 / 1_000_000,
        "cache_read": 1.5 / 1_000_000,
        "cache_creation": 18.75 / 1_000_000,
    },
    "claude-sonnet-4-6": {
        "input": 3.0 / 1_000_000,
        "output": 15.0 / 1_000_000,
        "cache_read": 0.3 / 1_000_000,
        "cache_creation": 3.75 / 1_000_000,
    },
    "claude-haiku-4-5": {
        "input": 0.8 / 1_000_000,
        "output": 4.0 / 1_000_000,
        "cache_read": 0.08 / 1_000_000,
        "cache_creation": 1.0 / 1_000_000,
    },
}

# Sorted longest-prefix-first for matching
_SORTED_PREFIXES = sorted(MODEL_PRICING.keys(), key=len, reverse=True)
_DEFAULT_MODEL = "claude-sonnet-4-6"


def _resolve_pricing(model: str | None) -> dict[str, float]:
    """Find pricing by prefix match. Falls back to Sonnet pricing."""
    if model:
        for prefix in _SORTED_PREFIXES:
            if model.startswith(prefix):
                return MODEL_PRICING[prefix]
    return MODEL_PRICING[_DEFAULT_MODEL]


def calculate_cost(
    model: str | None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
) -> float:
    """Calculate USD cost for a single agent run."""
    pricing = _resolve_pricing(model)
    return (
        input_tokens * pricing["input"]
        + output_tokens * pricing["output"]
        + cache_read_tokens * pricing.get("cache_read", 0)
        + cache_creation_tokens * pricing.get("cache_creation", 0)
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/test_cost.py -v`
Expected: 5 passed

- [ ] **Step 5: Create test fixtures**

Create `dashboard-api/tests/conftest.py`:

```python
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

    # Load schema
    schema_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "eval", "init-db.sql"
    )
    with open(schema_path) as f:
        # Split on semicolons and execute each statement individually
        # to handle ALTER TABLE failures on new databases gracefully
        sql = f.read()
        for statement in sql.split(";"):
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(statement)
                except Exception:
                    pass  # ALTER TABLE on already-existing column
    conn.commit()

    # Seed data
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

    # Agent runs for run_abc12345
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

    # Gate event
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
```

- [ ] **Step 6: Commit**

```bash
git add dashboard-api/
git commit -m "feat: add cost calculation module with tests

Per-token pricing for Opus, Sonnet, Haiku. Prefix matching for versioned
model IDs. Falls back to Sonnet pricing for unknown models.
Includes shared test fixtures with seed data for all API tests."
```

---

### Task 3: Build FastAPI backend — database module and run endpoints

**Files:**
- Create: `dashboard-api/db.py`
- Create: `dashboard-api/routes/__init__.py`
- Create: `dashboard-api/routes/runs.py`
- Create: `dashboard-api/main.py`
- Create: `dashboard-api/requirements.txt`
- Create: `dashboard-api/tests/test_runs.py`

- [ ] **Step 1: Create requirements.txt**

Create `dashboard-api/requirements.txt`:

```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
sse-starlette>=2.0.0
pytest>=8.0.0
httpx>=0.27.0
```

- [ ] **Step 2: Write the failing test**

Create `dashboard-api/tests/test_runs.py`:

```python
import pytest
from fastapi.testclient import TestClient

from dashboard_api.main import create_app


@pytest.fixture
def client(db_path):
    app = create_app(db_path)
    return TestClient(app)


def test_list_runs(client):
    resp = client.get("/api/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["run_id"] == "run_abc12345"
    assert data[0]["feature"] == "Add user sharing"
    assert "total_cost_usd" in data[0]


def test_list_runs_has_agent_count(client):
    resp = client.get("/api/runs")
    data = resp.json()
    run = data[0]
    assert "agent_count" in run
    assert run["agent_count"] == 8


def test_get_run_detail(client):
    resp = client.get("/api/runs/run_abc12345")
    assert resp.status_code == 200
    data = resp.json()
    assert data["run_id"] == "run_abc12345"
    assert "agents" in data
    assert len(data["agents"]) == 8
    assert "gates" in data


def test_get_run_detail_not_found(client):
    resp = client.get("/api/runs/run_nonexistent")
    assert resp.status_code == 404


def test_run_stats(client):
    resp = client.get("/api/runs/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_runs"] == 2
    assert data["passed"] == 1
    assert data["failed"] == 1
    assert "total_cost_usd" in data
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api pip install -q fastapi httpx && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/test_runs.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 4: Write db.py**

Create `dashboard-api/db.py`:

```python
"""SQLite database access for the dashboard API."""

import sqlite3
from contextlib import contextmanager


def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    """Convert SQLite rows to dicts."""
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}


@contextmanager
def get_db(db_path: str):
    """Context manager for database connections."""
    conn = sqlite3.connect(db_path, timeout=10)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
    finally:
        conn.close()
```

- [ ] **Step 5: Write routes/runs.py**

Create `dashboard-api/routes/__init__.py` (empty).

Create `dashboard-api/routes/runs.py`:

```python
"""Run-related API endpoints."""

from fastapi import APIRouter, HTTPException

from dashboard_api.db import get_db

router = APIRouter(prefix="/api/runs", tags=["runs"])


def _init(db_path: str) -> APIRouter:
    """Create router bound to a specific database path."""

    @router.get("")
    def list_runs():
        with get_db(db_path) as conn:
            runs = conn.execute(
                """SELECT fr.*,
                   (SELECT COUNT(*) FROM agent_runs ar WHERE ar.run_id = fr.run_id) as agent_count
                   FROM factory_runs fr
                   ORDER BY started_at DESC LIMIT 50"""
            ).fetchall()
        return runs

    @router.get("/stats")
    def run_stats():
        with get_db(db_path) as conn:
            row = conn.execute(
                """SELECT
                   COUNT(*) as total_runs,
                   SUM(CASE WHEN overall_verdict = 'pass' THEN 1 ELSE 0 END) as passed,
                   SUM(CASE WHEN overall_verdict = 'fail' THEN 1 ELSE 0 END) as failed,
                   SUM(CASE WHEN overall_verdict IS NULL THEN 1 ELSE 0 END) as in_progress,
                   COALESCE(SUM(total_cost_usd), 0) as total_cost_usd
                   FROM factory_runs"""
            ).fetchone()
        return row

    @router.get("/{run_id}")
    def get_run(run_id: str):
        with get_db(db_path) as conn:
            run = conn.execute(
                "SELECT * FROM factory_runs WHERE run_id = ?", (run_id,)
            ).fetchone()
            if not run:
                raise HTTPException(status_code=404, detail="Run not found")

            agents = conn.execute(
                """SELECT * FROM agent_runs WHERE run_id = ?
                   ORDER BY started_at""",
                (run_id,),
            ).fetchall()

            gates = conn.execute(
                """SELECT * FROM gate_events WHERE run_id = ?
                   ORDER BY timestamp""",
                (run_id,),
            ).fetchall()

        return {**run, "agents": agents, "gates": gates}

    return router


def create_router(db_path: str) -> APIRouter:
    """Factory function to create a router bound to a database."""
    return _init(db_path)
```

- [ ] **Step 6: Write main.py**

Create `dashboard-api/main.py`:

```python
"""FastAPI application for the Justice League Factory dashboard."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dashboard_api.routes.runs import create_router as runs_router


def create_app(db_path: str | None = None) -> FastAPI:
    """Create the FastAPI application."""
    if db_path is None:
        db_path = os.environ.get(
            "FACTORY_DB",
            os.path.join(os.path.dirname(__file__), "..", "eval", "factory.db"),
        )

    app = FastAPI(title="Justice League Factory — Mission Control")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(runs_router(db_path))

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    import uvicorn

    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/test_runs.py -v`
Expected: 5 passed

- [ ] **Step 8: Commit**

```bash
git add dashboard-api/
git commit -m "feat: add FastAPI backend with run endpoints

Database module, run list/detail/stats endpoints. CORS enabled.
Tested with seed data fixtures."
```

---

### Task 4: Add agent and event endpoints

**Files:**
- Create: `dashboard-api/routes/agents.py`
- Create: `dashboard-api/routes/events.py`
- Create: `dashboard-api/tests/test_agents.py`
- Modify: `dashboard-api/main.py`

- [ ] **Step 1: Write the failing tests**

Create `dashboard-api/tests/test_agents.py`:

```python
import pytest
from fastapi.testclient import TestClient

from dashboard_api.main import create_app


@pytest.fixture
def client(db_path):
    app = create_app(db_path)
    return TestClient(app)


def test_list_agents_by_run(client):
    resp = client.get("/api/agents?run_id=run_abc12345")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 8
    agents = [a["agent"] for a in data]
    assert "brainiac" in agents
    assert "cyborg" in agents


def test_list_agents_no_run_id(client):
    resp = client.get("/api/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 8  # all from run_abc12345 (run_def67890 has none)


def test_get_transcript(client, db_path):
    """Insert a transcript and verify retrieval."""
    import sqlite3

    conn = sqlite3.connect(db_path)
    # Get the first agent_run id
    row = conn.execute("SELECT id FROM agent_runs LIMIT 1").fetchone()
    agent_run_id = row[0]
    conn.execute(
        """INSERT INTO agent_transcripts (agent_run_id, prompt_text, response_text,
           full_transcript, model, total_input_tokens, total_output_tokens)
           VALUES (?, 'test prompt', 'test response', 'full transcript text',
           'claude-opus-4-6', 1000, 500)""",
        (agent_run_id,),
    )
    conn.commit()
    conn.close()

    resp = client.get(f"/api/agents/{agent_run_id}/transcript")
    assert resp.status_code == 200
    data = resp.json()
    assert data["prompt_text"] == "test prompt"
    assert data["full_transcript"] == "full transcript text"


def test_get_transcript_not_found(client):
    resp = client.get("/api/agents/99999/transcript")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/test_agents.py -v`
Expected: FAIL with `ImportError`

- [ ] **Step 3: Write routes/agents.py**

Create `dashboard-api/routes/agents.py`:

```python
"""Agent-related API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from dashboard_api.db import get_db

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _init(db_path: str) -> APIRouter:

    @router.get("")
    def list_agents(run_id: str | None = Query(None)):
        with get_db(db_path) as conn:
            if run_id:
                rows = conn.execute(
                    "SELECT * FROM agent_runs WHERE run_id = ? ORDER BY started_at",
                    (run_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 50"
                ).fetchall()
        return rows

    @router.get("/{agent_run_id}/transcript")
    def get_transcript(agent_run_id: int):
        with get_db(db_path) as conn:
            row = conn.execute(
                "SELECT * FROM agent_transcripts WHERE agent_run_id = ?",
                (agent_run_id,),
            ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transcript not found")
        return row

    return router


def create_router(db_path: str) -> APIRouter:
    return _init(db_path)
```

- [ ] **Step 4: Write routes/events.py**

Create `dashboard-api/routes/events.py`:

```python
"""Event-related API endpoints — backwards compatible with existing log viewer."""

from fastapi import APIRouter, Query

from dashboard_api.db import get_db

router = APIRouter(prefix="/api/events", tags=["events"])


def _init(db_path: str) -> APIRouter:

    @router.get("")
    def list_events(
        since: int = Query(0),
        limit: int = Query(200),
        offset: int = Query(0),
        from_ts: str | None = Query(None, alias="from"),
        to_ts: str | None = Query(None, alias="to"),
        agent: list[str] | None = Query(None),
    ):
        conditions = ["id > ?"]
        args: list = [since]

        if from_ts:
            conditions.append("timestamp >= ?")
            args.append(from_ts)
        if to_ts:
            conditions.append("timestamp <= ?")
            args.append(to_ts)
        if agent:
            placeholders = ", ".join(["?" for _ in agent])
            conditions.append(f"agent_type IN ({placeholders})")
            args.extend(agent)

        where = " AND ".join(conditions)
        args.extend([limit, offset])

        with get_db(db_path) as conn:
            rows = conn.execute(
                f"SELECT * FROM events WHERE {where} ORDER BY id DESC LIMIT ? OFFSET ?",
                args,
            ).fetchall()
        return rows

    @router.get("/count")
    def event_count(
        from_ts: str | None = Query(None, alias="from"),
        to_ts: str | None = Query(None, alias="to"),
        agent: list[str] | None = Query(None),
    ):
        conditions: list[str] = []
        args: list = []

        if from_ts:
            conditions.append("timestamp >= ?")
            args.append(from_ts)
        if to_ts:
            conditions.append("timestamp <= ?")
            args.append(to_ts)
        if agent:
            placeholders = ", ".join(["?" for _ in agent])
            conditions.append(f"agent_type IN ({placeholders})")
            args.extend(agent)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        with get_db(db_path) as conn:
            row = conn.execute(
                f"SELECT COUNT(*) as count FROM events {where}", args
            ).fetchone()
        return {"count": row["count"] if row else 0}

    return router


def create_router(db_path: str) -> APIRouter:
    return _init(db_path)
```

- [ ] **Step 5: Update main.py to include new routers**

Replace `dashboard-api/main.py` with:

```python
"""FastAPI application for the Justice League Factory dashboard."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dashboard_api.routes.runs import create_router as runs_router
from dashboard_api.routes.agents import create_router as agents_router
from dashboard_api.routes.events import create_router as events_router


def create_app(db_path: str | None = None) -> FastAPI:
    """Create the FastAPI application."""
    if db_path is None:
        db_path = os.environ.get(
            "FACTORY_DB",
            os.path.join(os.path.dirname(__file__), "..", "eval", "factory.db"),
        )

    app = FastAPI(title="Justice League Factory — Mission Control")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(runs_router(db_path))
    app.include_router(agents_router(db_path))
    app.include_router(events_router(db_path))

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    import uvicorn

    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

- [ ] **Step 6: Run all tests**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/ -v`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add dashboard-api/
git commit -m "feat: add agent, event, and transcript API endpoints

Agent listing by run, transcript retrieval. Event listing with pagination,
filtering by timestamp and agent — backwards compatible with existing
log viewer frontend."
```

---

### Task 5: Add analytics endpoints

**Files:**
- Create: `dashboard-api/routes/analytics.py`
- Create: `dashboard-api/tests/test_analytics.py`
- Modify: `dashboard-api/main.py`

- [ ] **Step 1: Write the failing tests**

Create `dashboard-api/tests/test_analytics.py`:

```python
import pytest
from fastapi.testclient import TestClient

from dashboard_api.main import create_app


@pytest.fixture
def client(db_path):
    app = create_app(db_path)
    return TestClient(app)


def test_success_rate(client):
    resp = client.get("/api/analytics/success-rate")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert "date" in data[0]
    assert "success_rate" in data[0]


def test_cost_trend(client):
    resp = client.get("/api/analytics/cost-trend")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert "date" in data[0]
    assert "avg_cost_usd" in data[0]


def test_agent_failure_rates(client):
    resp = client.get("/api/analytics/agent-failure-rates")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for item in data:
        assert "agent" in item
        assert "total_runs" in item
        assert "failure_rate" in item
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/test_analytics.py -v`
Expected: FAIL

- [ ] **Step 3: Write routes/analytics.py**

Create `dashboard-api/routes/analytics.py`:

```python
"""Analytics endpoints for trend data and aggregations."""

from fastapi import APIRouter, Query

from dashboard_api.db import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _init(db_path: str) -> APIRouter:

    @router.get("/success-rate")
    def success_rate(days: int = Query(30)):
        with get_db(db_path) as conn:
            rows = conn.execute(
                """SELECT date(started_at) as date,
                   COUNT(*) as total,
                   SUM(CASE WHEN overall_verdict = 'pass' THEN 1 ELSE 0 END) as passed,
                   ROUND(
                     CAST(SUM(CASE WHEN overall_verdict = 'pass' THEN 1 ELSE 0 END) AS REAL)
                     / COUNT(*) * 100, 1
                   ) as success_rate
                   FROM factory_runs
                   WHERE started_at >= date('now', ? || ' days')
                   GROUP BY date(started_at)
                   ORDER BY date(started_at)""",
                (f"-{days}",),
            ).fetchall()
        return rows

    @router.get("/cost-trend")
    def cost_trend(days: int = Query(30)):
        with get_db(db_path) as conn:
            rows = conn.execute(
                """SELECT date(started_at) as date,
                   COUNT(*) as run_count,
                   ROUND(AVG(total_cost_usd), 4) as avg_cost_usd,
                   ROUND(SUM(total_cost_usd), 4) as total_cost_usd
                   FROM factory_runs
                   WHERE started_at >= date('now', ? || ' days')
                   GROUP BY date(started_at)
                   ORDER BY date(started_at)""",
                (f"-{days}",),
            ).fetchall()
        return rows

    @router.get("/agent-failure-rates")
    def agent_failure_rates(days: int = Query(30)):
        with get_db(db_path) as conn:
            rows = conn.execute(
                """SELECT agent,
                   COUNT(*) as total_runs,
                   SUM(CASE WHEN verdict = 'fail' THEN 1 ELSE 0 END) as failures,
                   ROUND(
                     CAST(SUM(CASE WHEN verdict = 'fail' THEN 1 ELSE 0 END) AS REAL)
                     / COUNT(*) * 100, 1
                   ) as failure_rate
                   FROM agent_runs
                   WHERE started_at >= date('now', ? || ' days')
                   AND verdict IS NOT NULL
                   GROUP BY agent
                   ORDER BY failure_rate DESC""",
                (f"-{days}",),
            ).fetchall()
        return rows

    return router


def create_router(db_path: str) -> APIRouter:
    return _init(db_path)
```

- [ ] **Step 4: Update main.py to include analytics router**

Add this import to `dashboard-api/main.py`:

```python
from dashboard_api.routes.analytics import create_router as analytics_router
```

And add this line after the other `include_router` calls:

```python
    app.include_router(analytics_router(db_path))
```

- [ ] **Step 5: Run all tests**

Run: `cd /Users/amitgulati/Projects/AgenticFactoryPresentation/justice-league-factory && PYTHONPATH=dashboard-api python -m pytest dashboard-api/tests/ -v`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add dashboard-api/
git commit -m "feat: add analytics API endpoints

Success rate over time, cost trends, agent failure rates.
All queries support configurable lookback window."
```

---

### Task 6: Add SSE endpoint for real-time updates

**Files:**
- Create: `dashboard-api/routes/sse.py`
- Modify: `dashboard-api/main.py`

- [ ] **Step 1: Write routes/sse.py**

Create `dashboard-api/routes/sse.py`:

```python
"""Server-Sent Events endpoint for real-time dashboard updates."""

import asyncio
import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from dashboard_api.db import get_db

router = APIRouter(tags=["sse"])


def _init(db_path: str) -> APIRouter:

    @router.get("/api/stream")
    async def stream():
        """Stream new events and agent run updates to the dashboard."""

        async def event_generator():
            last_event_id = 0
            last_agent_run_id = 0

            # Get current max IDs
            with get_db(db_path) as conn:
                row = conn.execute("SELECT MAX(id) as max_id FROM events").fetchone()
                if row and row["max_id"]:
                    last_event_id = row["max_id"]
                row = conn.execute(
                    "SELECT MAX(id) as max_id FROM agent_runs"
                ).fetchone()
                if row and row["max_id"]:
                    last_agent_run_id = row["max_id"]

            while True:
                await asyncio.sleep(1)

                with get_db(db_path) as conn:
                    # Check for new events
                    new_events = conn.execute(
                        "SELECT * FROM events WHERE id > ? ORDER BY id LIMIT 50",
                        (last_event_id,),
                    ).fetchall()

                    for event in new_events:
                        last_event_id = event["id"]
                        yield {
                            "event": "event",
                            "data": json.dumps(event, default=str),
                        }

                    # Check for new/updated agent runs
                    new_runs = conn.execute(
                        "SELECT * FROM agent_runs WHERE id > ? ORDER BY id LIMIT 50",
                        (last_agent_run_id,),
                    ).fetchall()

                    for run in new_runs:
                        last_agent_run_id = run["id"]
                        yield {
                            "event": "agent_run",
                            "data": json.dumps(run, default=str),
                        }

        return EventSourceResponse(event_generator())

    return router


def create_router(db_path: str) -> APIRouter:
    return _init(db_path)
```

- [ ] **Step 2: Update main.py**

Add this import:

```python
from dashboard_api.routes.sse import create_router as sse_router
```

And add this line after the other `include_router` calls:

```python
    app.include_router(sse_router(db_path))
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-api/
git commit -m "feat: add SSE endpoint for real-time dashboard updates

Polls SQLite for new events and agent runs, streams them to
connected dashboard clients via Server-Sent Events."
```

---

### Task 7: Update telemetry hook with cost calculation

**Files:**
- Modify: `.claude/hooks/log-telemetry.py`

- [ ] **Step 1: Add cost import and calculation**

In `.claude/hooks/log-telemetry.py`, add at the top of the file after the existing imports:

```python
# Import cost calculation — gracefully degrade if not available
try:
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dashboard-api"))
    from dashboard_api.cost import calculate_cost
except ImportError:
    def calculate_cost(**kwargs) -> float:
        return 0.0
```

- [ ] **Step 2: Update log_agent_run to include cost and phase**

In the `log_agent_run` function, after the `transcript = parse_transcript(...)` line, add:

```python
    cost = calculate_cost(
        model=transcript["model"] or event.get("model"),
        input_tokens=transcript["input_tokens"],
        output_tokens=transcript["output_tokens"],
        cache_read_tokens=transcript["cache_read_tokens"],
        cache_creation_tokens=transcript["cache_creation_tokens"],
    )
```

Then update the INSERT statement to include the new columns. Replace the existing `cursor = conn.execute("""INSERT INTO agent_runs ...` block with:

```python
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
```

- [ ] **Step 3: Commit**

```bash
git add .claude/hooks/log-telemetry.py
git commit -m "feat: add cost calculation to telemetry hook

Calculates USD cost per agent run using the dashboard-api cost module.
Gracefully degrades if cost module not available. Records phase metadata."
```

---

### Task 8: Scaffold React frontend

**Files:**
- Create: `dashboard-app/package.json`
- Create: `dashboard-app/vite.config.ts`
- Create: `dashboard-app/tsconfig.json`
- Create: `dashboard-app/index.html`
- Create: `dashboard-app/src/main.tsx`
- Create: `dashboard-app/src/theme.css`
- Create: `dashboard-app/src/api/client.ts`
- Create: `dashboard-app/src/api/types.ts`

- [ ] **Step 1: Create package.json**

Create `dashboard-app/package.json`:

```json
{
  "name": "justice-league-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

Create `dashboard-app/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create tsconfig.json**

Create `dashboard-app/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create index.html**

Create `dashboard-app/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Justice League Factory — Mission Control</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create theme.css**

Create `dashboard-app/src/theme.css` — ported from existing `dashboard/style.css`:

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a1a;
  --bg-secondary: #0d0d20;
  --bg-card: #1e1b4b;
  --bg-card-hover: #2e1065;
  --bg-header: linear-gradient(90deg, #0a0a1a, #1a0a2e);

  /* Borders */
  --border-primary: #1e1b4b;
  --border-accent: #2e1065;
  --border-highlight: #7c3aed;

  /* Text */
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #6b7280;
  --text-accent: #a78bfa;

  /* Status */
  --status-pass: #34d399;
  --status-fail: #f87171;
  --status-warning: #fbbf24;
  --status-active: #c084fc;
  --status-info: #60a5fa;

  /* Agent colors */
  --agent-batman: #a78bfa;
  --agent-brainiac: #a78bfa;
  --agent-martian-manhunter: #34d399;
  --agent-cyborg: #60a5fa;
  --agent-wonder-woman: #f472b6;
  --agent-flash: #fbbf24;
  --agent-green-lantern: #4ade80;
  --agent-lois-lane: #f9a8d4;
  --agent-oracle: #c084fc;

  /* Typography */
  --font-mono: 'Space Mono', monospace;

  /* Spacing */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 20px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { font-size: 16px; }

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  min-height: 100vh;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
```

- [ ] **Step 6: Create API types**

Create `dashboard-app/src/api/types.ts`:

```typescript
export interface FactoryRun {
  run_id: string;
  feature: string | null;
  started_at: string;
  completed_at: string | null;
  overall_verdict: string | null;
  total_duration_ms: number | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  gate_config: string | null;
  agent_count?: number;
}

export interface AgentRun {
  id: number;
  run_id: string | null;
  agent: string;
  model: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  verdict: string | null;
  retry_count: number;
  artifacts_produced: string | null;
  phase: string | null;
  cost_usd: number;
}

export interface GateEvent {
  id: number;
  run_id: string | null;
  gate_name: string;
  action: string;
  comment: string | null;
  wait_duration_ms: number | null;
  timestamp: string;
}

export interface RunDetail extends FactoryRun {
  agents: AgentRun[];
  gates: GateEvent[];
}

export interface RunStats {
  total_runs: number;
  passed: number;
  failed: number;
  in_progress: number;
  total_cost_usd: number;
}

export interface Transcript {
  id: number;
  agent_run_id: number;
  prompt_text: string | null;
  response_text: string | null;
  full_transcript: string | null;
  model: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface SuccessRatePoint {
  date: string;
  total: number;
  passed: number;
  success_rate: number;
}

export interface CostTrendPoint {
  date: string;
  run_count: number;
  avg_cost_usd: number;
  total_cost_usd: number;
}

export interface AgentFailureRate {
  agent: string;
  total_runs: number;
  failures: number;
  failure_rate: number;
}

export interface LogEvent {
  id: number;
  session_id: string | null;
  event_type: string;
  timestamp: string;
  agent_type: string | null;
  agent_id: string | null;
  data: string;
}
```

- [ ] **Step 7: Create API client**

Create `dashboard-app/src/api/client.ts`:

```typescript
import type {
  FactoryRun,
  RunDetail,
  RunStats,
  AgentRun,
  Transcript,
  SuccessRatePoint,
  CostTrendPoint,
  AgentFailureRate,
  LogEvent,
} from "./types";

const BASE = "";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  runs: {
    list: () => get<FactoryRun[]>("/api/runs"),
    get: (runId: string) => get<RunDetail>(`/api/runs/${runId}`),
    stats: () => get<RunStats>("/api/runs/stats"),
  },
  agents: {
    listByRun: (runId: string) => get<AgentRun[]>(`/api/agents?run_id=${runId}`),
    transcript: (agentRunId: number) =>
      get<Transcript>(`/api/agents/${agentRunId}/transcript`),
  },
  events: {
    list: (params: {
      since?: number;
      limit?: number;
      offset?: number;
      from?: string;
      to?: string;
      agent?: string[];
    }) => {
      const q = new URLSearchParams();
      if (params.since) q.set("since", String(params.since));
      if (params.limit) q.set("limit", String(params.limit));
      if (params.offset) q.set("offset", String(params.offset));
      if (params.from) q.set("from", params.from);
      if (params.to) q.set("to", params.to);
      params.agent?.forEach((a) => q.append("agent", a));
      return get<LogEvent[]>(`/api/events?${q}`);
    },
    count: (params?: { from?: string; to?: string; agent?: string[] }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set("from", params.from);
      if (params?.to) q.set("to", params.to);
      params?.agent?.forEach((a) => q.append("agent", a));
      const qs = q.toString();
      return get<{ count: number }>(`/api/events/count${qs ? "?" + qs : ""}`);
    },
  },
  analytics: {
    successRate: (days = 30) =>
      get<SuccessRatePoint[]>(`/api/analytics/success-rate?days=${days}`),
    costTrend: (days = 30) =>
      get<CostTrendPoint[]>(`/api/analytics/cost-trend?days=${days}`),
    agentFailureRates: (days = 30) =>
      get<AgentFailureRate[]>(`/api/analytics/agent-failure-rates?days=${days}`),
  },
};
```

- [ ] **Step 8: Create main.tsx with router**

Create `dashboard-app/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./theme.css";
import { Layout } from "./components/Layout";
import { RunSummary } from "./views/RunSummary";
import { RunTrace } from "./views/RunTrace";
import { Analytics } from "./views/Analytics";
import { LogView } from "./views/LogView";
import { TranscriptView } from "./views/TranscriptView";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<RunSummary />} />
          <Route path="runs/:runId" element={<RunTrace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<LogView />} />
          <Route path="transcript/:agentRunId" element={<TranscriptView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 9: Commit**

```bash
git add dashboard-app/
git commit -m "feat: scaffold React frontend with theme, types, API client, and router

Vite + React 18 + TypeScript. Design tokens ported from existing dashboard.
API client typed to match FastAPI backend. Router with 5 views."
```

---

### Task 9: Build Layout and RunSummary view

**Files:**
- Create: `dashboard-app/src/components/Layout.tsx`
- Create: `dashboard-app/src/components/StatsBar.tsx`
- Create: `dashboard-app/src/components/RunCard.tsx`
- Create: `dashboard-app/src/views/RunSummary.tsx`

- [ ] **Step 1: Create Layout.tsx**

Create `dashboard-app/src/components/Layout.tsx`:

```tsx
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Runs" },
  { to: "/analytics", label: "Analytics" },
  { to: "/logs", label: "Logs" },
];

export function Layout() {
  return (
    <>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-header)",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            letterSpacing: "3px",
            color: "var(--text-accent)",
          }}
        >
          JUSTICE LEAGUE FACTORY
        </h1>
        <nav style={{ display: "flex", gap: "4px" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.875rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "1px",
                color: isActive ? "var(--text-accent)" : "var(--text-muted)",
                background: isActive ? "var(--bg-card)" : "transparent",
                border: isActive
                  ? "1px solid var(--border-accent)"
                  : "1px solid transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </>
  );
}
```

- [ ] **Step 2: Create StatsBar.tsx**

Create `dashboard-app/src/components/StatsBar.tsx`:

```tsx
import type { RunStats } from "../api/types";

interface Props {
  stats: RunStats | null;
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        borderRadius: "var(--radius-md)",
        padding: "12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "28px", fontWeight: "bold", color }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}

export function StatsBar({ stats }: Props) {
  if (!stats) return null;

  return (
    <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
      <StatCard
        value={stats.total_runs}
        label="Total Runs"
        color="var(--status-pass)"
      />
      <StatCard value={stats.passed} label="Shipped" color="var(--status-pass)" />
      <StatCard value={stats.failed} label="Failed" color="var(--status-fail)" />
      <StatCard
        value={stats.in_progress}
        label="In Progress"
        color="var(--status-warning)"
      />
      <StatCard
        value={`$${stats.total_cost_usd.toFixed(2)}`}
        label="Total Cost"
        color="var(--status-info)"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create RunCard.tsx**

Create `dashboard-app/src/components/RunCard.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import type { FactoryRun } from "../api/types";

interface Props {
  run: FactoryRun;
}

const statusColors: Record<string, string> = {
  pass: "var(--status-pass)",
  fail: "var(--status-fail)",
};

export function RunCard({ run }: Props) {
  const navigate = useNavigate();
  const color = statusColors[run.overall_verdict ?? ""] ?? "var(--status-warning)";
  const duration = run.total_duration_ms
    ? `${Math.round(run.total_duration_ms / 60000)}m`
    : "--";

  return (
    <div
      onClick={() => navigate(`/runs/${run.run_id}`)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px",
        background:
          run.overall_verdict === "fail"
            ? "color-mix(in srgb, var(--status-fail) 5%, transparent)"
            : "rgba(30, 41, 59, 0.5)",
        border: `1px solid ${
          run.overall_verdict === "fail"
            ? "color-mix(in srgb, var(--status-fail) 20%, transparent)"
            : "#334155"
        }`,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(167, 139, 250, 0.08)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background =
          run.overall_verdict === "fail"
            ? "color-mix(in srgb, var(--status-fail) 5%, transparent)"
            : "rgba(30, 41, 59, 0.5)")
      }
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}
        >
          {run.feature ?? run.run_id}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {run.overall_verdict === "pass" ? "Shipped" : run.overall_verdict === "fail" ? "Failed" : "In progress"}
          {run.agent_count ? ` · ${run.agent_count} agents` : ""}
        </div>
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          flexShrink: 0,
          width: 60,
          textAlign: "right",
        }}
      >
        ${run.total_cost_usd?.toFixed(2) ?? "--"}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          flexShrink: 0,
          width: 50,
          textAlign: "right",
        }}
      >
        {duration}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create RunSummary.tsx**

Create `dashboard-app/src/views/RunSummary.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { FactoryRun, RunStats } from "../api/types";
import { StatsBar } from "../components/StatsBar";
import { RunCard } from "../components/RunCard";

export function RunSummary() {
  const [runs, setRuns] = useState<FactoryRun[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);

  useEffect(() => {
    api.runs.list().then(setRuns).catch(console.error);
    api.runs.stats().then(setStats).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <StatsBar stats={stats} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {runs.map((run) => (
          <RunCard key={run.run_id} run={run} />
        ))}
        {runs.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "var(--text-muted)",
            }}
          >
            No factory runs yet. Dispatch Batman to get started.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add dashboard-app/src/
git commit -m "feat: build Layout, StatsBar, RunCard, and RunSummary view

App shell with header and tab navigation. Stats bar with run counts
and total cost. Run cards with status, cost, duration — clickable
to drill into trace view."
```

---

### Task 10: Build RunTrace view

**Files:**
- Create: `dashboard-app/src/components/TraceTimeline.tsx`
- Create: `dashboard-app/src/components/TraceNode.tsx`
- Create: `dashboard-app/src/components/GateNode.tsx`
- Create: `dashboard-app/src/components/QualityGates.tsx`
- Create: `dashboard-app/src/views/RunTrace.tsx`

- [ ] **Step 1: Create TraceNode.tsx**

Create `dashboard-app/src/components/TraceNode.tsx`:

```tsx
import type { AgentRun } from "../api/types";

interface Props {
  agent: AgentRun;
  onClick?: () => void;
}

const agentColors: Record<string, string> = {
  batman: "var(--agent-batman)",
  brainiac: "var(--agent-brainiac)",
  "martian-manhunter": "var(--agent-martian-manhunter)",
  cyborg: "var(--agent-cyborg)",
  "wonder-woman": "var(--agent-wonder-woman)",
  flash: "var(--agent-flash)",
  "green-lantern": "var(--agent-green-lantern)",
  "lois-lane": "var(--agent-lois-lane)",
  oracle: "var(--agent-oracle)",
};

const agentEmoji: Record<string, string> = {
  batman: "\ud83e\uddb7",
  brainiac: "\ud83e\udde0",
  "martian-manhunter": "\ud83d\udc7d",
  cyborg: "\ud83e\udd16",
  "wonder-woman": "\ud83d\udc78",
  flash: "\u26a1",
  "green-lantern": "\ud83d\udc9a",
  "lois-lane": "\ud83d\udcf0",
  oracle: "\ud83d\udd2e",
};

function formatPhase(phase: string | null): string {
  if (!phase) return "";
  return phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TraceNode({ agent, onClick }: Props) {
  const color = agentColors[agent.agent] ?? "var(--text-secondary)";
  const emoji = agentEmoji[agent.agent] ?? "\u2753";
  const isDevils = agent.phase === "devils_advocate";
  const duration = agent.duration_ms
    ? `${Math.round(agent.duration_ms / 60000)}m`
    : "--";

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 14px",
        background: isDevils
          ? "color-mix(in srgb, var(--status-warning) 5%, transparent)"
          : "rgba(30, 41, 59, 0.5)",
        border: `1px solid ${
          isDevils
            ? "color-mix(in srgb, var(--status-warning) 20%, transparent)"
            : "#334155"
        }`,
        borderRadius: "var(--radius-md)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
          {emoji}{" "}
          <strong style={{ color }}>
            {agent.agent.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </strong>
          {agent.phase ? ` — ${formatPhase(agent.phase)}` : ""}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {duration} · ${agent.cost_usd?.toFixed(2) ?? "--"} ·{" "}
          {((agent.input_tokens + agent.output_tokens) / 1000).toFixed(0)}k tokens
        </div>
      </div>
      {agent.verdict && (
        <div
          style={{
            fontSize: "11px",
            marginTop: "4px",
            color:
              agent.verdict === "pass"
                ? "var(--status-pass)"
                : "var(--status-fail)",
          }}
        >
          {agent.verdict.toUpperCase()}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create GateNode.tsx**

Create `dashboard-app/src/components/GateNode.tsx`:

```tsx
import type { GateEvent } from "../api/types";

interface Props {
  gate: GateEvent;
}

export function GateNode({ gate }: Props) {
  const waitMins = gate.wait_duration_ms
    ? Math.round(gate.wait_duration_ms / 60000)
    : null;

  return (
    <div
      style={{
        padding: "10px 14px",
        background: "color-mix(in srgb, var(--status-info) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--status-info) 30%, transparent)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ fontSize: "13px", color: "var(--status-info)" }}>
        \ud83e\uddd1 <strong>{gate.gate_name.toUpperCase()} Gate — {gate.action}</strong>
      </div>
      {gate.comment && (
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
          Comment: &ldquo;{gate.comment}&rdquo;
          {waitMins !== null && ` · wait: ${waitMins}m`}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create QualityGates.tsx**

Create `dashboard-app/src/components/QualityGates.tsx`:

```tsx
import type { AgentRun } from "../api/types";
import { TraceNode } from "./TraceNode";

interface Props {
  agents: AgentRun[];
  onClickAgent?: (agent: AgentRun) => void;
}

export function QualityGates({ agents, onClickAgent }: Props) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {agents.map((agent) => (
        <div key={agent.id} style={{ flex: 1 }}>
          <TraceNode
            agent={agent}
            onClick={onClickAgent ? () => onClickAgent(agent) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create TraceTimeline.tsx**

Create `dashboard-app/src/components/TraceTimeline.tsx`:

```tsx
import type { AgentRun, GateEvent } from "../api/types";
import { TraceNode } from "./TraceNode";
import { GateNode } from "./GateNode";
import { QualityGates } from "./QualityGates";

interface Props {
  agents: AgentRun[];
  gates: GateEvent[];
  onClickAgent: (agent: AgentRun) => void;
}

type TimelineItem =
  | { type: "agent"; data: AgentRun }
  | { type: "gate"; data: GateEvent }
  | { type: "quality_gates"; data: AgentRun[] };

export function TraceTimeline({ agents, gates, onClickAgent }: Props) {
  // Build timeline: interleave agents and gates, group quality gates
  const qualityGateAgents = ["wonder-woman", "flash", "green-lantern"];
  const qualityGroup = agents.filter((a) =>
    qualityGateAgents.includes(a.agent) && a.phase === "quality_gate"
  );
  const regularAgents = agents.filter(
    (a) => !(qualityGateAgents.includes(a.agent) && a.phase === "quality_gate")
  );

  const items: TimelineItem[] = [];

  // Add regular agents
  for (const agent of regularAgents) {
    items.push({ type: "agent", data: agent });

    // Insert gate after matching phase
    const phaseToGate: Record<string, string> = {
      research: "spec",
      plan_v1: "plan",
      devils_advocate: "plan",
    };
    const gateName = phaseToGate[agent.phase ?? ""];
    if (gateName) {
      const gate = gates.find((g) => g.gate_name === gateName);
      if (gate) items.push({ type: "gate", data: gate });
    }
  }

  // Add quality gates as a group
  if (qualityGroup.length > 0) {
    items.push({ type: "quality_gates", data: qualityGroup });
  }

  return (
    <div style={{ position: "relative", paddingLeft: "24px" }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: 7,
          top: 4,
          bottom: 4,
          width: 2,
          background: "#334155",
        }}
      />

      {items.map((item, i) => (
        <div key={i} style={{ position: "relative", marginBottom: "16px" }}>
          {/* Timeline dot */}
          <div
            style={{
              position: "absolute",
              left: -20,
              top: 4,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background:
                item.type === "gate"
                  ? "var(--status-info)"
                  : item.type === "quality_gates"
                  ? "var(--status-pass)"
                  : "var(--status-pass)",
              border: "2px solid var(--bg-primary)",
            }}
          />

          {item.type === "agent" && (
            <TraceNode
              agent={item.data}
              onClick={() => onClickAgent(item.data)}
            />
          )}
          {item.type === "gate" && <GateNode gate={item.data} />}
          {item.type === "quality_gates" && (
            <QualityGates agents={item.data} onClickAgent={onClickAgent} />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create RunTrace.tsx**

Create `dashboard-app/src/views/RunTrace.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RunDetail } from "../api/types";
import { TraceTimeline } from "../components/TraceTimeline";

export function RunTrace() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunDetail | null>(null);

  useEffect(() => {
    if (runId) {
      api.runs.get(runId).then(setRun).catch(console.error);
    }
  }, [runId]);

  if (!run) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  const duration = run.total_duration_ms
    ? `${Math.round(run.total_duration_ms / 60000)}m`
    : "--";
  const gateConfig = run.gate_config ? JSON.parse(run.gate_config) : null;

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid #334155",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "16px",
              color: "var(--text-primary)",
              fontWeight: 500,
            }}
          >
            {run.feature ?? run.run_id}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {run.run_id} · duration {duration} · cost $
            {run.total_cost_usd?.toFixed(2)}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              background:
                run.overall_verdict === "pass"
                  ? "color-mix(in srgb, var(--status-pass) 15%, transparent)"
                  : "color-mix(in srgb, var(--status-fail) 15%, transparent)",
              color:
                run.overall_verdict === "pass"
                  ? "var(--status-pass)"
                  : "var(--status-fail)",
            }}
          >
            {run.overall_verdict?.toUpperCase() ?? "IN PROGRESS"}
          </span>
          {gateConfig && (
            <span
              style={{
                fontSize: "11px",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background:
                  "color-mix(in srgb, var(--status-info) 15%, transparent)",
                color: "var(--status-info)",
              }}
            >
              gates: spec={gateConfig.spec} plan={gateConfig.plan} ship=
              {gateConfig.ship}
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <TraceTimeline
        agents={run.agents}
        gates={run.gates}
        onClickAgent={(agent) => navigate(`/transcript/${agent.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add dashboard-app/src/
git commit -m "feat: build RunTrace view with timeline, gates, and quality gate cards

TraceTimeline renders agents chronologically with timeline dots.
GateNode shows human review events inline. QualityGates renders
parallel review agents side-by-side. Click any agent to view transcript."
```

---

### Task 11: Build Analytics, LogView, and TranscriptView

**Files:**
- Create: `dashboard-app/src/components/Chart.tsx`
- Create: `dashboard-app/src/views/Analytics.tsx`
- Create: `dashboard-app/src/views/LogView.tsx`
- Create: `dashboard-app/src/components/TranscriptPanel.tsx`
- Create: `dashboard-app/src/views/TranscriptView.tsx`
- Create: `dashboard-app/src/api/sse.ts`

- [ ] **Step 1: Create Chart.tsx**

Create `dashboard-app/src/components/Chart.tsx`:

```tsx
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  color: string;
  title: string;
  yLabel?: string;
}

export function Chart({ data, dataKey, xKey, color, title, yLabel }: Props) {
  return (
    <div
      style={{
        background: "rgba(30, 41, 59, 0.5)",
        border: "1px solid #334155",
        borderRadius: "var(--radius-md)",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-secondary)",
          marginBottom: "12px",
        }}
      >
        {title}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            label={
              yLabel
                ? {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                    fontSize: 10,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              background: "#0d0d20",
              border: "1px solid #2e1065",
              borderRadius: 4,
              color: "#e2e8f0",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create Analytics.tsx**

Create `dashboard-app/src/views/Analytics.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type {
  SuccessRatePoint,
  CostTrendPoint,
  AgentFailureRate,
} from "../api/types";
import { Chart } from "../components/Chart";

export function Analytics() {
  const [successRate, setSuccessRate] = useState<SuccessRatePoint[]>([]);
  const [costTrend, setCostTrend] = useState<CostTrendPoint[]>([]);
  const [failureRates, setFailureRates] = useState<AgentFailureRate[]>([]);

  useEffect(() => {
    api.analytics.successRate().then(setSuccessRate).catch(console.error);
    api.analytics.costTrend().then(setCostTrend).catch(console.error);
    api.analytics.agentFailureRates().then(setFailureRates).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h2
        style={{
          fontSize: "1.125rem",
          color: "var(--text-accent)",
          marginBottom: "16px",
          letterSpacing: "1px",
        }}
      >
        ANALYTICS
      </h2>
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <Chart
            data={successRate}
            dataKey="success_rate"
            xKey="date"
            color="var(--status-pass)"
            title="First-Pass Success Rate (%)"
            yLabel="%"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Chart
            data={costTrend}
            dataKey="avg_cost_usd"
            xKey="date"
            color="var(--status-info)"
            title="Average Cost per Feature ($)"
            yLabel="$"
          />
        </div>
      </div>

      {/* Agent failure rates */}
      <div
        style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid #334155",
          borderRadius: "var(--radius-md)",
          padding: "16px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            marginBottom: "12px",
          }}
        >
          Agent Failure Rate
        </div>
        {failureRates.map((item) => (
          <div
            key={item.agent}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                width: 120,
              }}
            >
              {item.agent}
            </span>
            <div
              style={{
                flex: 1,
                background: "var(--bg-primary)",
                borderRadius: "var(--radius-sm)",
                height: 8,
              }}
            >
              <div
                style={{
                  width: `${Math.min(item.failure_rate, 100)}%`,
                  background:
                    item.failure_rate > 15
                      ? "var(--status-fail)"
                      : item.failure_rate > 5
                      ? "var(--status-warning)"
                      : "var(--status-pass)",
                  height: "100%",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", width: 40 }}>
              {item.failure_rate}%
            </span>
          </div>
        ))}
        {failureRates.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            No data yet
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create LogView.tsx**

Create `dashboard-app/src/views/LogView.tsx`:

```tsx
import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { LogEvent } from "../api/types";

const agentColors: Record<string, string> = {
  batman: "var(--agent-batman)",
  "martian-manhunter": "var(--agent-martian-manhunter)",
  cyborg: "var(--agent-cyborg)",
  "wonder-woman": "var(--agent-wonder-woman)",
  flash: "var(--agent-flash)",
  "green-lantern": "var(--agent-green-lantern)",
  "lois-lane": "var(--agent-lois-lane)",
  oracle: "var(--agent-oracle)",
};

function formatDetail(event: LogEvent): string {
  try {
    const data = JSON.parse(event.data);
    if (event.event_type === "SubagentStart") return "Agent dispatched";
    if (event.event_type === "SubagentStop") {
      const msg = data.last_assistant_message ?? "";
      return msg.length > 200 ? msg.substring(0, 200) + "..." : msg;
    }
    if (event.event_type === "PreToolUse") {
      const tool = data.tool_name ?? "?";
      const input = data.tool_input ?? {};
      if (tool === "Read" && input.file_path) return `Read ${input.file_path}`;
      if (tool === "Write" && input.file_path) return `Write ${input.file_path}`;
      if (tool === "Bash" && input.command)
        return `Bash: ${input.command.substring(0, 100)}`;
      return tool;
    }
    if (event.event_type === "PostToolUse") return `${data.tool_name ?? "?"} completed`;
    if (event.event_type === "Stop") return "Session ended";
    return event.event_type;
  } catch {
    return "";
  }
}

export function LogView() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const loadPage = useCallback(
    async (p: number) => {
      const [evts, count] = await Promise.all([
        api.events.list({ limit: pageSize, offset: (p - 1) * pageSize }),
        api.events.count(),
      ]);
      setEvents(evts);
      setTotal(count.count);
      setPage(p);
    },
    [pageSize]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1.5rem",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          onClick={() => loadPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            padding: "0.25rem 0.75rem",
            cursor: page <= 1 ? "default" : "pointer",
            opacity: page <= 1 ? 0.35 : 1,
          }}
        >
          Newer
        </button>
        <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => loadPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            padding: "0.25rem 0.75rem",
            cursor: page >= totalPages ? "default" : "pointer",
            opacity: page >= totalPages ? 0.35 : 1,
          }}
        >
          Older
        </button>
      </div>

      {/* Log entries */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 140px 200px 1fr",
              gap: "12px",
              padding: "0.4375rem 1.5rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              borderBottom: "1px solid #12122a",
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color:
                  event.event_type === "SubagentStart"
                    ? "#818cf8"
                    : event.event_type === "SubagentStop"
                    ? "var(--text-accent)"
                    : event.event_type === "Stop"
                    ? "#f472b6"
                    : "var(--text-muted)",
              }}
            >
              {event.event_type}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.875rem",
                color: agentColors[event.agent_type ?? ""] ?? "var(--text-muted)",
              }}
            >
              {event.agent_type ?? "--"}
            </span>
            <span style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
              {formatDetail(event)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TranscriptPanel.tsx**

Create `dashboard-app/src/components/TranscriptPanel.tsx`:

```tsx
import type { Transcript } from "../api/types";

interface Props {
  transcript: Transcript;
  agentName: string;
}

function formatTranscript(jsonl: string): string {
  const lines = jsonl.trim().split("\n");
  let output = "";
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const role = entry.role ?? entry.type ?? "?";
      let content = "";
      if (entry.content) {
        if (typeof entry.content === "string") {
          content = entry.content;
        } else if (Array.isArray(entry.content)) {
          content = entry.content
            .map((c: Record<string, unknown>) =>
              (c.text as string) ?? (c.tool_use_id as string) ?? JSON.stringify(c)
            )
            .join("\n");
        }
      } else if (entry.message) {
        content = JSON.stringify(entry.message, null, 2);
      }
      if (content) {
        output += `--- ${(role as string).toUpperCase()} ---\n${content}\n\n`;
      }
    } catch {
      output += line + "\n";
    }
  }
  return output || jsonl;
}

export function TranscriptPanel({ transcript, agentName }: Props) {
  const tokens = `In: ${(transcript.total_input_tokens ?? 0).toLocaleString()} | Out: ${(transcript.total_output_tokens ?? 0).toLocaleString()}`;

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-accent)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            color: "var(--text-accent)",
            letterSpacing: "1px",
          }}
        >
          {agentName} — Transcript
        </h3>
      </div>
      <div
        style={{
          padding: "0.5rem 1.25rem",
          fontSize: "0.875rem",
          color: "var(--text-muted)",
          borderBottom: "1px solid #12122a",
          display: "flex",
          gap: "20px",
        }}
      >
        <span>Model: {transcript.model ?? "unknown"}</span>
        <span>{tokens}</span>
      </div>
      <pre
        style={{
          flex: 1,
          overflow: "auto",
          padding: "1rem 1.25rem",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}
      >
        {transcript.full_transcript
          ? formatTranscript(transcript.full_transcript)
          : `--- PROMPT ---\n${transcript.prompt_text ?? "(not captured)"}\n\n--- RESPONSE ---\n${transcript.response_text ?? "(not captured)"}`}
      </pre>
    </div>
  );
}
```

- [ ] **Step 5: Create TranscriptView.tsx**

Create `dashboard-app/src/views/TranscriptView.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Transcript } from "../api/types";
import { TranscriptPanel } from "../components/TranscriptPanel";

export function TranscriptView() {
  const { agentRunId } = useParams<{ agentRunId: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agentRunId) {
      api.agents
        .transcript(parseInt(agentRunId))
        .then(setTranscript)
        .catch(() => setError("Transcript not found"));
    }
  }, [agentRunId]);

  return (
    <div style={{ padding: "24px", height: "calc(100vh - 60px)" }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-accent)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          padding: "0.25rem 0.75rem",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        Back
      </button>

      {error ? (
        <div style={{ color: "var(--status-fail)", textAlign: "center", padding: "48px" }}>
          {error}
        </div>
      ) : transcript ? (
        <TranscriptPanel
          transcript={transcript}
          agentName={`Agent Run #${agentRunId}`}
        />
      ) : (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "48px" }}>
          Loading...
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create SSE client**

Create `dashboard-app/src/api/sse.ts`:

```typescript
import type { LogEvent, AgentRun } from "./types";

type EventHandler = {
  onEvent?: (event: LogEvent) => void;
  onAgentRun?: (run: AgentRun) => void;
};

export function connectSSE(handlers: EventHandler): () => void {
  const source = new EventSource("/api/stream");

  source.addEventListener("event", (e) => {
    const data = JSON.parse(e.data) as LogEvent;
    handlers.onEvent?.(data);
  });

  source.addEventListener("agent_run", (e) => {
    const data = JSON.parse(e.data) as AgentRun;
    handlers.onAgentRun?.(data);
  });

  source.onerror = () => {
    // Auto-reconnect is built into EventSource
  };

  return () => source.close();
}
```

- [ ] **Step 7: Commit**

```bash
git add dashboard-app/src/
git commit -m "feat: build Analytics, LogView, TranscriptView, and SSE client

Analytics view with Recharts bar charts for success rate, cost trend,
and agent failure rates. LogView ported from existing dashboard with
pagination. TranscriptView shows full LLM conversation. SSE client
for real-time dashboard updates."
```

---

### Task 12: Update serve-dashboard.sh and add .gitignore

**Files:**
- Modify: `scripts/serve-dashboard.sh`
- Create: `dashboard-app/.gitignore`

- [ ] **Step 1: Create dashboard-app/.gitignore**

Create `dashboard-app/.gitignore`:

```
node_modules/
dist/
.vite/
```

- [ ] **Step 2: Update serve-dashboard.sh**

Replace the contents of `scripts/serve-dashboard.sh` with:

```bash
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
if [ -f "$FACTORY_DIR/dashboard-api/main.py" ]; then
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
```

- [ ] **Step 3: Commit**

```bash
git add scripts/serve-dashboard.sh dashboard-app/.gitignore
git commit -m "feat: update serve-dashboard.sh for new React dashboard

Starts FastAPI backend + Vite dev server when available. Falls back
to legacy static dashboard if dashboard-app/node_modules missing."
```

---

### Task 13: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Append this line to `.gitignore`:

```
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to .gitignore"
```
