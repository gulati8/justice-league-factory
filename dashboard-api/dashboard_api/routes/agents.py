"""Agent-related API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from dashboard_api.db import get_db


def _init(db_path: str) -> APIRouter:
    router = APIRouter(prefix="/api/agents", tags=["agents"])

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
