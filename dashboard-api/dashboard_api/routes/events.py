"""Event-related API endpoints — backwards compatible with existing log viewer."""

from fastapi import APIRouter, Query

from dashboard_api.db import get_db


def _init(db_path: str) -> APIRouter:
    router = APIRouter(prefix="/api/events", tags=["events"])

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
