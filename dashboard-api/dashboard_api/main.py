"""FastAPI application for the Justice League Factory dashboard."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dashboard_api.routes.agents import create_router as agents_router
from dashboard_api.routes.analytics import create_router as analytics_router
from dashboard_api.routes.events import create_router as events_router
from dashboard_api.routes.runs import create_router as runs_router
from dashboard_api.routes.sse import create_router as sse_router


def create_app(db_path: str | None = None) -> FastAPI:
    """Create the FastAPI application."""
    if db_path is None:
        db_path = os.environ.get(
            "FACTORY_DB",
            os.path.join(os.path.dirname(__file__), "..", "..", "eval", "factory.db"),
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
    app.include_router(analytics_router(db_path))
    app.include_router(sse_router(db_path))

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    import uvicorn
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8080)
