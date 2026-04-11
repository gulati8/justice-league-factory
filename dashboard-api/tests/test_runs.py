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
