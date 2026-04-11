"""Analytics endpoints for trend data and aggregations."""

from fastapi import APIRouter, Query

from dashboard_api.db import get_db


def _init(db_path: str) -> APIRouter:
    router = APIRouter(prefix="/api/analytics", tags=["analytics"])

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
