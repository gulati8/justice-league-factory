"""Server-Sent Events endpoint for real-time dashboard updates."""

import asyncio
import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from dashboard_api.db import get_db


def _init(db_path: str) -> APIRouter:
    router = APIRouter(tags=["sse"])

    @router.get("/api/stream")
    async def stream():
        """Stream new events and agent run updates to the dashboard."""

        async def event_generator():
            last_event_id = 0
            last_agent_run_id = 0

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
