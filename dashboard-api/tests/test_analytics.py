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
