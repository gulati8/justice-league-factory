"""Run-related API endpoints."""

from fastapi import APIRouter, HTTPException

from dashboard_api.db import get_db


def _init(db_path: str) -> APIRouter:
    router = APIRouter(prefix="/api/runs", tags=["runs"])

    @router.get("")
    def list_runs():
        with get_db(db_path) as conn:
            runs = conn.execute(
                """SELECT fr.*,
                   (SELECT COUNT(*) FROM agent_runs ar WHERE ar.run_id = fr.run_id) as agent_count
                   FROM factory_runs fr
                   ORDER BY started_at ASC LIMIT 50"""
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
                "SELECT * FROM agent_runs WHERE run_id = ? ORDER BY started_at",
                (run_id,),
            ).fetchall()

            gates = conn.execute(
                "SELECT * FROM gate_events WHERE run_id = ? ORDER BY timestamp",
                (run_id,),
            ).fetchall()

        return {**run, "agents": agents, "gates": gates}

    return router


def create_router(db_path: str) -> APIRouter:
    return _init(db_path)
